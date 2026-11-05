// Release-time checksums include mutable metadata independently of the narration dataset ID.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const files = {};
function digest(file) {
    let bytes = readFileSync(file);
    if (/\.(?:html|js|css|json|txt|svg)$|(?:^|\/)LICENSE$/.test(file)) {
        const canonical = Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'));
        if (!bytes.equals(canonical)) writeFileSync(file, canonical);
        bytes = canonical;
    }
    return createHash('sha256').update(bytes).digest('hex');
}
function walk(path) {
    for (const e of readdirSync(path, { withFileTypes: true })) {
        const file = path + '/' + e.name;
        if (e.isDirectory()) walk(file);
        else files[file] = digest(file);
    }
}
for (const dir of ['data/v2', 'data/topics', 'data/search', 'data/notifications', 'data/arabic-metadata']) walk(dir);
for (const file of ['data/reading-pools.json', 'data/daily-sayings.json']) files[file] = digest(file);
for (const file of readdirSync('.').filter(f => /\.(?:html|js|css)$/.test(f) && f !== 'sw.js')) files[file] = digest(file);
walk('vendor/sqljs');
files['vendor/material-icons/LICENSE'] = digest('vendor/material-icons/LICENSE');
writeFileSync('data/parity-manifest.json', JSON.stringify({ format: 1, datasetId: JSON.parse(readFileSync('data/v2/manifest.json')).datasetId, files }, null, 2) + '\n');
console.log(`Hashed ${Object.keys(files).length} runtime data assets`);
