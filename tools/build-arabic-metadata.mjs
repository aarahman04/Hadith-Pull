// Extract optional Arabic reference metadata from the exact audited Sunnah.com source snapshot.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readSql } from '../../Hadith-Pull-Android/tools/sunnah-ingest/io.mjs';
import { cleanText, jsTrim } from '../../Hadith-Pull-Android/tools/sunnah-ingest/text.mjs';

const input = process.argv[2];
if (!input) throw Error('Usage: node tools/build-arabic-metadata.mjs SOURCE.sql');
const index = JSON.parse(readFileSync('data/v2/index.json'));
const sourceHash = createHash('sha256').update(readFileSync(input)).digest('hex');
assert.equal(sourceHash, index.source.dump_sha256, 'Arabic metadata must use the shipped source snapshot');
const source = new Map((await readSql(input)).map(row => [row.englishURN, row]));
const outputs = ['data/arabic-metadata', '../Hadith-Pull-Android/app/src/main/assets/hadith/arabic-metadata'];
outputs.forEach(dir => mkdirSync(dir, { recursive: true }));
let chapters = 0, narrators = 0, count = 0;
for (const collection of index.collections) {
    const strings = [''], ids = new Map([['', 0]]), records = {};
    const intern = text => { if (!ids.has(text)) { ids.set(text, strings.length); strings.push(text); } return ids.get(text); };
    for (const shard of collection.shards) for (const record of JSON.parse(readFileSync(`data/v2/${collection.id}/${shard.k}.json`))) {
        const row = source.get(record.urn); assert.ok(row, record.urn);
        assert.equal(jsTrim(cleanText(row.englishBabName)), record.chapter, `Chapter identity for ${record.urn}`);
        let chapter = jsTrim(cleanText(row.arabicBabName));
        if (/^باب\s*$/u.test(chapter)) chapter = '';
        const names = record.narrator ? [...row.arabicText.matchAll(/\[narrator\b([^\]]*)\]([\s\S]*?)\[\/narrator\]/g)]
            .filter(match => /\brole="sahabi"/.test(match[1]))
            .map(match => jsTrim(cleanText(match[1].match(/\btooltip="([^"]+)"/)?.[1] || match[2]))) : [];
        const unique = [...new Set(names)].filter(Boolean);
        const narrator = unique.length ? `${unique.length > 1 ? 'الرواة' : 'الراوي'}: ${unique.join('، ')}` : '';
        if (chapter || narrator) records[record.urn] = [intern(chapter), intern(narrator)];
        chapters += Boolean(chapter); narrators += Boolean(narrator); count++;
    }
    const json = JSON.stringify({ format: 1, sourceSha256: sourceHash, strings, records }) + '\n';
    outputs.forEach(dir => writeFileSync(`${dir}/${collection.id}.json`, json));
}
writeFileSync('data/arabic-metadata/source.json', JSON.stringify({ source: 'Sunnah.com HadithTable.sql', sha256: sourceHash, records: count, chapters, narrators }, null, 2) + '\n');
console.log(`Verified ${count} identities; exported ${chapters} Arabic chapters and ${narrators} tagged narrator labels.`);
