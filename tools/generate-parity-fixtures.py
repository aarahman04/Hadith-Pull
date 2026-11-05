"""Run unchanged Android Kotlin search/quote code against read-only SQLite via JDBC.
Uses locally cached Gradle Kotlin/JDBC jars; writes only into this website.
Seed 20261105, existing gold untouched. Regenerate when Android sources/assets change.
"""
import base64
import hashlib
import json
from pathlib import Path
import random
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
ANDROID = ROOT.parent / 'Hadith-Pull-Android'
SOURCE = ANDROID / 'app/src/main/java/online/hadithpull/app'
CACHE = Path.home() / '.gradle/caches/modules-2/files-2.1'
OUT = ROOT / '.preview/oracle'
OUT.mkdir(parents=True, exist_ok=True)
CLASSES = OUT / 'classes'
CLASSES.mkdir(exist_ok=True)
def jar(group, name, version='*'):
    return str(next((CACHE / group / name).glob(version + '/*/*.jar')))
def load(path):
    return json.loads(path.read_text(encoding='utf-8'))
def b64(text):
    return base64.b64encode(text.encode()).decode()
labels = load(ROOT / 'data/topics/labels.json')['labels']
taxonomy = load(ROOT / 'data/topics/taxonomy.json')
(OUT / 'labels.tsv').write_text('\n'.join(k + '\t' + ','.join(v) for k,v in labels.items()), encoding='utf-8')
(OUT / 'subs.tsv').write_text('\n'.join(t['id'] + '\t' + ','.join(s['id'] for s in t['subtopics']) for t in taxonomy['topics']), encoding='utf-8')
entries = [s for t in taxonomy['topics'] for s in t['subtopics']] + taxonomy['situations']
(OUT / 'names.tsv').write_text('\n'.join(t['id'] + '\t' + b64(t['title'] + ' ' + t['description']) for t in entries), encoding='utf-8')
cases = []
for name in ['queries.jsonl','queries.everyday.jsonl']:
    for line in (ANDROID / 'tools/search/eval' / name).read_text(encoding='utf-8').splitlines():
        if line.strip():
            item = json.loads(line)
            cases.append({'kind':'search', 'query':item['query'], 'gold':item['expected_urns'], 'origin':name + ':' + item['id']})
index = load(ROOT / 'data/v2/index.json')
records = [(c['id'], r) for c in index['collections'] for s in c['shards'] for r in load(ROOT / f"data/v2/{c['id']}/{s['k']}.json")]
rng = random.Random(20261105)
for c,r in rng.sample(records, 24):
    title = next(collection['title'] for collection in index['collections'] if collection['id'] == c)
    cases.append({'kind':'search','query':f"{title} {r['ref']}", 'origin':'seed-reference', 'urn':r['urn']})
    words = re.findall(r'[A-Za-z0-9]+',r['english'])
    if len(words) > 12:
        i = rng.randrange(0, len(words)-8)
        cases.append({'kind':'search','query':' '.join(words[i:i+8]),'origin':'seed-phrase','urn':r['urn']})
for query in ['I keep lying','The woman punished over a cat','three men trapped in a cave','ablutoin','الأعمال بالنيات']:
    cases.append({'kind':'search','query':query,'origin':'targeted'})
for query,name,collections,grades in [('charity','',['muslim'],['sahih']),('cat','huraira',['bukhari'],[]),('prayer','',[],['daif']),('mercy','', ['nawawi40'],['sahih'])]:
    cases.append({'kind':'advanced','query':query,'name':name,'collections':collections,'grades':grades,'origin':'filters'})
(OUT / 'queries.tsv').write_text('\n'.join('\t'.join([c['kind'],b64(c['query']),b64(c.get('name','')),','.join(c.get('collections',[])),','.join(c.get('grades',[]))]) for c in cases), encoding='utf-8')
pools = load(ROOT / 'data/reading-pools.json')
byurn = {r['urn']:r for _,r in records}
(OUT / 'widget.tsv').write_text('\n'.join(u + '\t' + b64(byurn[u]['english']) + '\t' + b64(byurn[u].get('narrator','')) for u in pools['widget']), encoding='utf-8')
(OUT / 'daily.tsv').write_text('\n'.join(u + '\t' + b64(byurn[u]['english']) for u, *_ in pools['daily']), encoding='utf-8')
compiler = jar('org.jetbrains.kotlin','kotlin-compiler-embeddable','2.2.21')
stdlib = jar('org.jetbrains.kotlin','kotlin-stdlib','2.2.21')
cp = ';'.join([compiler,stdlib,jar('org.jetbrains.kotlin','kotlin-script-runtime'),jar('org.jetbrains.kotlin','kotlin-reflect'),jar('org.jetbrains.kotlinx','kotlinx-coroutines-core-jvm'),jar('org.jetbrains','annotations')])
jdbc = jar('org.xerial','sqlite-jdbc')
runtime = ';'.join([str(CLASSES),stdlib,jdbc])
subprocess.run(['javac','-d',str(CLASSES),str(ROOT/'tools/oracle/Cursor.java')],check=True)
sources = [SOURCE / 'data/search/SearchEngine.kt', *sorted((SOURCE/'domain/search').glob('*.kt')),*sorted((SOURCE/'domain/eligibility').glob('*.kt'))]
subprocess.run(['java','-cp',cp,'org.jetbrains.kotlin.cli.jvm.K2JVMCompiler','-no-stdlib','-no-reflect','-classpath',runtime,'-d',str(CLASSES),*[str(s) for s in sources],*[str(s) for s in (ROOT/'tools/oracle').glob('*.kt')]],check=True)
subprocess.run(['java','-cp',runtime,'MainKt',str(OUT),str(ROOT/'data/search/v1/search.db')],check=True)
results = [json.loads(line) for line in (OUT/'results.jsonl').read_text(encoding='utf-8').splitlines()]
assert len(results) == len(cases)
fixtures = {'seed':20261105,'oracle':'Unchanged Android SearchEngine.kt / SearchText.kt / ReferenceQuery.kt / Spelling.kt, JDBC FTS4', 'sourceHashes':{s.relative_to(SOURCE).as_posix(): hashlib.sha256(s.read_bytes()).hexdigest() for s in sources},'cases':[{**c,'expected':r} for c,r in zip(cases,results)]}
(ROOT/'tests/fixtures').mkdir(exist_ok=True)
(ROOT/'tests/fixtures/android-search.json').write_text(json.dumps(fixtures,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
for name,target in [('widget.json','data/daily-sayings.json'),('hijri.json','data/notifications/umm-al-qura.json')]:
    (ROOT/target).write_bytes((OUT/name).read_bytes())
readable = set(load(OUT/'readable.json'))
pools['daily'] = [[*entry[:3], entry[0] in readable] for entry in pools['daily']]
(ROOT/'data/reading-pools.json').write_text(json.dumps(pools,separators=(',',':'))+'\n',encoding='utf-8')
print(f'Generated {len(cases)} Android search fixtures, {len(pools["widget"])} exact widget sayings/cycle and offline JVM Umm al-Qura month starts.')
