"""Turn Android's narrators.db into small JSON shards the website fetches on demand.

Usage: python tools/build-narrators.py [path/to/narrators.db] [version]
The database is Android's export (tools/science-of-hadith/export.py there); nothing here edits its words.
Every query mirrors data/NarratorRepository.kt in the Android app, so the website shows the same people,
links, verdicts and sources in the same order.

Layout of data/narrators/v1/:
  index.json        version, shard counts, works (one row per author/work/edition/url/reuse), notes (route origin
                    and end notes, which routes name by number), names (id ->
                    [name, arabic, generation, students]) for chain cards and lists
  chains/<k>.json   urn -> report (title, isnad, source, routes with steps); k = urn % CHAIN_SHARDS
  people/<k>.json   id -> profile (aliases, verdicts, family, teachers, students, hadith carried);
                    k = fnv1a(id) % PEOPLE_SHARDS
  titles/<k>.json   urn -> report title, for the list of hadith a person carried; k = urn % TITLE_SHARDS
A source is [work index, locator]: Android's citation is "author, work · locator", then edition and url.
"""
import json
import shutil
import sqlite3
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ANDROID_DB = ROOT.parent / 'Hadith-Pull-Android/app/src/main/assets/science-of-hadith/narrators.db'
OUT = ROOT / 'data/narrators/v1'
CHAIN_SHARDS, PEOPLE_SHARDS, TITLE_SHARDS = 256, 128, 32


def fnv1a(text):
    """Same as Narrators.shardOf in narrators.js."""
    h = 0x811c9dc5
    for b in text.encode('utf-8'):
        h = ((h ^ b) * 0x01000193) & 0xffffffff
    return h


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')


def build(db_path, version):
    db = sqlite3.connect(f'file:{db_path}?mode=ro', uri=True)
    q = lambda sql, *args: db.execute(sql, args).fetchall()

    works, work_ids, sources = [], {}, {}
    for sid, author, work, edition, locator, url, reuse in q('SELECT id, author, work, edition, locator, url, reuse FROM source ORDER BY id'):
        key = (author, work, edition, url, reuse)
        if key not in work_ids:
            work_ids[key] = len(works)
            works.append(list(key))
        sources[sid] = [work_ids[key], locator]

    students = dict(q("SELECT origin, count(DISTINCT target) FROM relation WHERE kind='transmission' GROUP BY origin"))
    people = {pid: [name, arabic, generation, students.get(pid, 0)]
              for pid, name, arabic, generation in q('SELECT id, name, arabic, generation FROM person ORDER BY id')}

    # Family between a teacher and the next narrator (familyLink): the first kind by name.
    family = {}
    for origin, target, kind, source in q("SELECT origin, target, kind, source FROM relation WHERE kind<>'transmission' ORDER BY origin, target, kind, source"):
        family.setdefault((origin, target), [kind[0].upper() + kind[1:], sources[source]])

    chains = [{} for _ in range(CHAIN_SHARDS)]
    titles = [{} for _ in range(TITLE_SHARDS)]
    steps = {}
    for urn, number, person, wording in q('SELECT urn, route, person, wording FROM step ORDER BY CAST(urn AS INTEGER), route, position'):
        steps.setdefault((urn, number), []).append((person, wording))
    # Route notes repeat (about ninety distinct), so a route names its notes by their place in index.json's notes.
    notes, note_ids = [], {}
    def note(text):
        if text is None:
            return None
        if text not in note_ids:
            note_ids[text] = len(notes)
            notes.append(text)
        return note_ids[text]
    routes = {}
    for urn, number, prophet, origin, end in q('SELECT urn, number, starts_at_prophet, origin, end_note FROM route ORDER BY CAST(urn AS INTEGER), number'):
        line = steps.get((urn, number), [])
        routes.setdefault(urn, []).append([number, prophet, note(origin), note(end), [
            [person, wording, family.get((line[i - 1][0], person)) if i else None] for i, (person, wording) in enumerate(line)]])
    for urn, title, isnad, source in q('SELECT urn, title, isnad, source FROM report ORDER BY CAST(urn AS INTEGER)'):
        chains[int(urn) % CHAIN_SHARDS][urn] = {'t': title, 'i': isnad, 's': sources[source], 'r': routes.get(urn, [])}
        titles[int(urn) % TITLE_SHARDS][urn] = title

    # Teachers and students (connections): one source per pair, the smallest id, most students first.
    links = {}
    for origin, target, source in q("""SELECT origin, target, min(source) FROM relation WHERE kind='transmission' GROUP BY origin, target"""):
        links.setdefault(('stu', origin), []).append([target, sources[source]])
        links.setdefault(('tch', target), []).append([origin, sources[source]])
    order = lambda row: (-people[row[0]][3], people[row[0]][0], row[0])
    for rows in links.values():
        rows.sort(key=order)

    carried = {}
    for person, urn in q('SELECT DISTINCT person, urn FROM step ORDER BY person, CAST(urn AS INTEGER)'):
        carried.setdefault(person, []).append(urn)

    shards = [{} for _ in range(PEOPLE_SHARDS)]
    for pid, generation, birth, death, places, biography, source in q(
            'SELECT id, generation, birth, death, places, biography, source FROM person ORDER BY id'):
        aliases = q("SELECT name, kind FROM alias WHERE person=? AND kind NOT IN ('Name', 'Arabic name') ORDER BY kind, name", pid)
        verdicts = q('SELECT critic, arabic, meaning, source FROM assessment WHERE person=? ORDER BY rowid', pid)
        kin = []
        for other, kind, origin, src in q("""SELECT CASE WHEN origin=? THEN target ELSE origin END, kind, origin, source FROM relation
                WHERE (origin=? OR target=?) AND kind<>'transmission'""", pid, pid, pid):
            label = ('Child' if kind in ('father', 'mother') else 'Nephew') if origin == pid else kind[0].upper() + kind[1:]
            kin.append([other, label, sources[src]])
        kin.sort(key=lambda row: (people[row[0]][0], row[0]))
        profile = {'b': birth, 'd': death, 'pl': places, 'bio': biography, 's': sources[source],
                   'al': [list(a) for a in aliases], 'as': [[c, a, m, sources[s]] for c, a, m, s in verdicts],
                   'fam': kin, 'tch': links.get(('tch', pid), []), 'stu': links.get(('stu', pid), []), 'car': carried.get(pid, [])}
        shards[fnv1a(pid) % PEOPLE_SHARDS][pid] = {k: v for k, v in profile.items() if v not in (None, [])}

    if OUT.exists():
        shutil.rmtree(OUT)
    write(OUT / 'index.json', {'version': version, 'chains': CHAIN_SHARDS, 'people': PEOPLE_SHARDS, 'titles': TITLE_SHARDS,
                               'works': works, 'notes': notes, 'names': people})
    for name, parts in (('chains', chains), ('people', shards), ('titles', titles)):
        for k, part in enumerate(parts):
            write(OUT / name / f'{k}.json', part)
    files = sorted(OUT.rglob('*.json'))
    print(f'{len(files)} files, {sum(f.stat().st_size for f in files):,} bytes in {OUT.relative_to(ROOT)}')


if __name__ == '__main__':
    db_path = Path(sys.argv[1]) if len(sys.argv) > 1 else ANDROID_DB
    version = sys.argv[2] if len(sys.argv) > 2 else (db_path.parent / 'version.txt').read_text().strip()
    build(db_path, version)
