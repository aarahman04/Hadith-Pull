// Builds data/v1/grades.json from the committed shards: one character per record, in dataset
// order, so the Reader's "Draw from" filter can pick a narration without downloading shards.
//   s = sahih, o = graded but not sahih (hasan, da'if, other), n = no grade
// Run after build-data.mjs:  node tools/build-grades.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const DATA = new URL('../data/v1/', import.meta.url);
const index = JSON.parse(readFileSync(new URL('index.json', DATA)));
const grades = {};

for (const c of index.collections) {
    let codes = '';
    for (const shard of c.shards) {
        for (const r of JSON.parse(readFileSync(new URL(`${c.id}/${shard}.json`, DATA)))) {
            codes += !r.primary ? 'n' : r.primary.cat === 'sahih' ? 's' : 'o';
        }
    }
    if (codes.length !== c.count) throw new Error(`${c.id}: ${codes.length} records, index says ${c.count}`);
    grades[c.id] = codes;
}

writeFileSync(new URL('grades.json', DATA), JSON.stringify(grades));
console.log('wrote data/v1/grades.json');
