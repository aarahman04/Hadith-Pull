// Builds data/v2/grades.json from the committed shards: one character per record, in dataset
// order, so the Reader's "Draw from" filter can pick a narration without downloading shards.
// s = sahih, o = other grade, n = no grade, - = excluded by the app's reading pool.
// Run after copying the Android app's shipped v2 bundle: node tools/build-grades.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const DATA = new URL('../data/v2/', import.meta.url);
const index = JSON.parse(readFileSync(new URL('index.json', DATA)));
const grades = {};
const lines = readFileSync(new URL('pools.txt', DATA), 'utf8').trim().split(/\r?\n/);
if (lines.shift() !== `hadith-pools 3 ${index.datasetId}`) throw new Error('Reading pools do not match the dataset');
const eligible = new Map(lines.map(line => {
    const [collection, shard, ...entries] = line.split(' ');
    return [`${collection}/${shard}`, new Set(entries.map(entry => Number(entry.split('.')[0])))];
}));

for (const c of index.collections) {
    let codes = '';
    for (const shard of c.shards) {
        const records = JSON.parse(readFileSync(new URL(`${c.id}/${shard.k}.json`, DATA)));
        for (const [offset, r] of records.entries()) {
            codes += !eligible.get(`${c.id}/${shard.k}`)?.has(offset) ? '-'
                : !r.primary ? 'n' : r.primary.cat === 'sahih' ? 's' : 'o';
        }
    }
    if (codes.length !== c.count) throw new Error(`${c.id}: ${codes.length} records, index says ${c.count}`);
    grades[c.id] = codes;
}

writeFileSync(new URL('grades.json', DATA), JSON.stringify(grades));
console.log('wrote data/v2/grades.json');
