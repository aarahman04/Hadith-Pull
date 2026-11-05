import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const json = path => JSON.parse(read(path));

test('Arabic sidecars match the audited corpus, have valid URNs, and are identical in Android', () => {
    const index = json('data/v2/index.json');
    let chapters = 0, narrators = 0, count = 0;
    for (const collection of index.collections) {
        const file = `data/arabic-metadata/${collection.id}.json`, metadata = json(file);
        assert.equal(metadata.sourceSha256, index.source.dump_sha256);
        assert.equal(read(file), readFileSync(new URL(`../../Hadith-Pull-Android/app/src/main/assets/hadith/arabic-metadata/${collection.id}.json`, import.meta.url), 'utf8'));
        const urns = new Set();
        for (const shard of collection.shards) for (const record of json(`data/v2/${collection.id}/${shard.k}.json`)) {
            urns.add(record.urn); count++;
        }
        for (const [urn, fields] of Object.entries(metadata.records)) {
            assert.ok(urns.has(urn), urn);
            assert.equal(fields.length, 2);
            for (const id of fields) assert.equal(typeof metadata.strings[id], 'string');
            chapters += Boolean(metadata.strings[fields[0]]); narrators += Boolean(metadata.strings[fields[1]]);
        }
    }
    assert.deepEqual({ records: count, chapters, narrators }, (({ records, chapters, narrators }) => ({ records, chapters, narrators }))(json('data/arabic-metadata/source.json')));
});

test('shard loading joins sourced Arabic chapter and narrator without changing English or identity', async () => {
    const context = vm.createContext({ document: { getElementById() { return null; }, addEventListener() {} }, window: { addEventListener() {} }, addEventListener() {},
        fetch: async path => ({ ok: true, json: async () => json(path) }) });
    vm.runInContext(read('script.js'), context);
    const records = await vm.runInContext("loadShard('bukhari', 0)", context);
    const h = records.find(h => h.urn === '770');
    assert.equal(h.chapterArabic, 'باب مَتَى يَصِحُّ سَمَاعُ الصَّغِيرِ');
    assert.equal(h.narratorArabic, 'الراوي: محمود بن الربيع الخزرجي');
    const original = json('data/v2/bukhari/0.json').find(h => h.urn === '770');
    for (const key of Object.keys(original)) assert.deepEqual(JSON.parse(JSON.stringify(h[key])), original[key], key);
    const mapped = context.mapped = h;
    assert.equal(vm.runInContext("toHadith(mapped, { id: 'bukhari', title: 'Sahih al-Bukhari' }).chapterArabic", context), mapped.chapterArabic);
});

test('unavailable optional Arabic metadata preserves readable corpus records', async () => {
    const context = vm.createContext({ document: { getElementById() { return null; }, addEventListener() {} }, window: { addEventListener() {} }, addEventListener() {},
        fetch: async path => ({ ok: !path.includes('arabic-metadata'), json: async () => json(path) }) });
    vm.runInContext(read('script.js'), context);
    const records = await vm.runInContext("loadShard('bukhari', 0)", context);
    assert.equal(records[0].chapterArabic, ''); assert.equal(records[0].narratorArabic, '');
    assert.ok(records[0].english); assert.ok(records[0].arabic);
});

test('a transient metadata failure retries and enriches the cached shard without refetching the corpus', async () => {
    let metadataRequests = 0, corpusRequests = 0;
    const context = vm.createContext({ document: { getElementById() { return null; }, addEventListener() {} }, window: { addEventListener() {} }, addEventListener() {},
        fetch: async path => {
            const sidecar = path.includes('arabic-metadata');
            if (sidecar) metadataRequests++; else corpusRequests++;
            return { ok: !sidecar || metadataRequests > 1, json: async () => json(path) };
        } });
    vm.runInContext(read('script.js'), context);
    const first = await vm.runInContext("loadShard('bukhari', 0)", context);
    assert.equal(first[0].chapterArabic, '');
    const recovered = await vm.runInContext("loadShard('bukhari', 0)", context);
    assert.equal(recovered, first);
    assert.ok(recovered[0].chapterArabic); assert.ok(recovered[0].narratorArabic);
    assert.equal(metadataRequests, 2); assert.equal(corpusRequests, 1);
});
