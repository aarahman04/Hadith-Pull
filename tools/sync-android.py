"""Copy authoritative Android assets; never rebuild or relabel religious content.
Usage: python tools/sync-android.py [../Hadith-Pull-Android]
Then: node tools/build-grades.mjs
"""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
ANDROID = Path(sys.argv[1] if len(sys.argv) > 1 else ROOT.parent / 'Hadith-Pull-Android')
ASSETS = ANDROID / 'app/src/main/assets'

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def sync():
    sources = {}
    for source_dir, target_dir in [('hadith/v2', 'data/v2'), ('topics', 'data/topics'), ('search/v1', 'data/search/v1')]:
        for source in sorted((ASSETS / source_dir).rglob('*')):
            if source.is_file():
                target = ROOT / target_dir / source.relative_to(ASSETS / source_dir)
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source, target)
                sources[target.relative_to(ROOT).as_posix()] = digest(target)
    source = ANDROID / 'docs/notifications/occasions-approved.json'
    if not source.exists():
        raise SystemExit('Approved occasions unavailable; do not substitute tools/topics/occasions.json')
    target = ROOT / 'data/notifications/occasions.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source, target)
    sources[target.relative_to(ROOT).as_posix()] = digest(target)
    subprocess.run(['node', 'tools/build-grades.mjs'], cwd=ROOT, check=True)
    index = json.loads((ROOT / 'data/v2/index.json').read_text(encoding='utf-8'))
    locations = {}
    widget = []
    daily = []
    flags = {}
    for line in (ROOT / 'data/v2/pools.txt').read_text().splitlines()[1:]:
        if not line.strip():
            continue
        collection, shard, *entries = line.split()
        for entry in entries:
            offset, flag = map(int, entry.split('.'))
            flags[(collection, int(shard), offset)] = flag
    for c in index['collections']:
        for shard in c['shards']:
            for offset, r in enumerate(json.loads((ROOT / f"data/v2/{c['id']}/{shard['k']}.json").read_text(encoding='utf-8'))):
                code = 'n' if not r.get('primary') else 's' if r['primary']['cat'] == 'sahih' else 'o'
                locations[r['urn']] = code
                flag = flags.get((c['id'], shard['k'], offset), 0)
                if flag & 4:
                    widget.append(r['urn'])
                if flag & 1:
                    daily.append([r['urn'], c['id'], len(r['english'])])
    derived = ROOT / 'data/reading-pools.json'
    derived.write_text(json.dumps({'grades': locations, 'widget': widget, 'daily': daily}, separators=(',', ':')) + '\n', encoding='utf-8')
    sources['data/reading-pools.json'] = digest(derived)
    sources['data/v2/grades.json'] = digest(ROOT / 'data/v2/grades.json')
    manifest = {'format': 1, 'datasetId': json.loads((ROOT / 'data/v2/manifest.json').read_text())['datasetId'], 'files': sources}
    (ROOT / 'data/parity-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    print(f'Synchronized {len(sources)} files; source hashes recorded in data/parity-manifest.json')

if __name__ == '__main__':
    sync()
