"""Export the approved CategoryArt.kt paths and shared mappings, not replacement artwork.
Material TwoTone vectors: @material-design-icons/svg 0.14.0 (Apache-2.0).
Run after sync-android.py. Source changes that this small exporter cannot read fail closed.
"""
import hashlib
import io
import json
from pathlib import Path
import re
import tarfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / 'Hadith-Pull-Android/app/src/main/java/online/hadithpull/app/ui/topics'
src = (SOURCE / 'CategoryArt.kt').read_text(encoding='utf-8')
materials = sorted(set(re.findall(r'Icons\.(?:AutoMirrored\.)?TwoTone\.(\w+)', src)))
target = ROOT / 'vendor/material-icons'
target.mkdir(parents=True, exist_ok=True)
if not all((target / (name + '.svg')).exists() for name in materials):
    blob = urllib.request.urlopen('https://registry.npmjs.org/@material-design-icons/svg/-/svg-0.14.0.tgz').read()
    archive = tarfile.open(fileobj=io.BytesIO(blob), mode='r:gz')
    for name in materials:
        snake = re.sub(r'(?<!^)([A-Z0-9])', r'_\1', name).lower()
        data = archive.extractfile('package/two-tone/' + snake + '.svg').read().decode()
        (target / (name + '.svg')).write_text(data, encoding='utf-8')
    (target / 'LICENSE').write_bytes(archive.extractfile('package/LICENSE').read())

icons = {name: re.sub(r'^.*?<svg[^>]*>|</svg>\s*$', '', (target / (name + '.svg')).read_text()).replace('fill="#000"', 'fill="currentColor"') for name in materials}
blocks = dict(re.findall(r'private val (\w+) by lazy \{(.*?)(?=\nprivate val |\Z)', src, re.S))

def resolve(expr):
    expr = expr.strip()
    return icons[expr.split('.')[-1]] if expr.startswith('Icons.') else custom(expr)

def custom(name):
    if name in icons:
        return icons[name]
    block = blocks[name]
    out = ''
    if 'logo("' in block:
        for alpha, path in re.findall(r'([\d.]+)f to "([^"]+)"', block):
            out += f'<path fill="currentColor" fill-rule="evenodd" opacity="{alpha}" d="{path}"/>'
    elif 'paired("' in block:
        a, b = re.search(r'paired\("[^"]+", (.*?), (.*?)\)', block).groups()
        out = f'<g transform="scale(.73)">{resolve(a)}</g><g transform="translate(12.5 12.5) scale(.46)">{resolve(b)}</g>'
    elif block.strip().startswith('Icons.'):
        out = resolve(block.split('}')[0])
    else:
        variables = dict(re.findall(r'val (\w+) = addPathNodes\("([^"]+)"\)', block))
        for line in block.splitlines():
            line = line.strip()
            if line.startswith('mark('):
                expr, scale, x, y = re.match(r'mark\((.*?), ([\d.]+)f, (-?[\d.]+)f, (-?[\d.]+)f\)', line).groups()
                out += f'<g transform="translate({x} {y}) scale({scale})">{resolve(expr)}</g>'
            if not line.startswith('addPath('):
                continue
            path = re.search(r'addPathNodes\("([^"]+)"\)', line)
            d = path.group(1) if path else variables[line.split('(')[1].split(',')[0]]
            fill = 'currentColor' if 'fill = ' in line else 'none'
            alpha = re.search(r'fillAlpha = ([\d.]+)f', line)
            stroke = re.search(r'strokeLineWidth = ([\d.]+)f', line)
            attrs = f' fill="{fill}" fill-rule="evenodd"'
            if alpha:
                attrs += f' fill-opacity="{alpha.group(1)}"'
            if stroke:
                attrs += f' stroke="currentColor" stroke-width="{stroke.group(1)}"'
            if 'StrokeCap.Round' in line:
                attrs += ' stroke-linecap="round"'
            if 'StrokeJoin.Round' in line:
                attrs += ' stroke-linejoin="round"'
            out += f'<path{attrs} d="{d}"/>'
        if name == 'warfareLogo':
            out = '<g opacity=".65">' + out + '</g><g transform="translate(24 0) scale(-1 1)">' + out + '</g>'
    assert out, name
    icons[name] = out
    return out

for name in blocks:
    custom(name)
def mapping(section):
    return {key: expr.split('.')[-1] if expr.startswith('Icons.') else expr for key, expr in re.findall(r'"([^"]+)" -> ([\w.]+)', section)}
art = {'categories': mapping(src.split('categoryMotif')[1].split('/** Same artwork')[0]), 'named': mapping(src.split('namedMotif')[1].split('private fun logo')[0]), 'svg': icons}
shorts = dict(re.findall(r'"([^"]+)" to "([^"]+)"', (SOURCE / 'ShortTitles.kt').read_text(encoding='utf-8')))
finder = (SOURCE / 'CategoryMap.kt').read_text(encoding='utf-8')
stop = re.findall(r'"([^"]+)"', finder.split('private val stopWords = setOf(')[1].split(')')[0])
syn = {k: re.findall(r'"([^"]+)"', v) for k, v in re.findall(r'"([^"]+)" to listOf\((.*?)\)', finder)}
for file, data in [('art.json', art), ('short-titles.json', shorts), ('finder.json', {'stopWords': stop, 'synonyms': syn})]:
    (ROOT / 'data/topics' / file).write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
manifest = {'CategoryArt.kt': hashlib.sha256(src.encode()).hexdigest(), 'ShortTitles.kt': hashlib.sha256((SOURCE / 'ShortTitles.kt').read_bytes()).hexdigest(), 'CategoryMap.kt': hashlib.sha256((SOURCE / 'CategoryMap.kt').read_bytes()).hexdigest()}
(ROOT / 'data/topics/source-hashes.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Exported {len(icons)} SVG marks, {len(shorts)} short titles; shared mappings retained.')
