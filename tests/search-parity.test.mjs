import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const read = file => readFileSync(new URL('../' + file, import.meta.url));
const json = file => JSON.parse(read(file));
const SQL = await require('../vendor/sqljs/sql-wasm.js')();
const { SearchEngine, foldArabic, foldEnglish, parseReference } = require('../search-engine.js');
const engine = new SearchEngine(new SQL.Database(read('data/search/v1/search.db')), json('data/topics/labels.json'), json('data/topics/taxonomy.json'), json('data/v2/legacy.json'));

test('actual shipped FTS4 supports Porter/unicode61, Arabic, exact forms, NEAR and pcnalx', () => {
    assert.ok(engine.rows("SELECT docid,matchinfo(en,'pcnalx') FROM en WHERE en MATCH 'intentions' LIMIT 1").length);
    assert.ok(engine.rows("SELECT docid FROM en WHERE en MATCH 'three NEAR/6 cave'").length);
    assert.ok(engine.rows("SELECT docid FROM ar WHERE ar MATCH 'الاعمال'").length);
    assert.ok(engine.rows("SELECT docid FROM exact WHERE exact MATCH 'overeating'").length);
    assert.equal(foldEnglish("Qur’ān أَبِي"), 'quran'); assert.equal(foldArabic('الْأَعْمَالُ'), 'الاعمال');
    assert.equal(parseReference('صحيح البخاري ١')[0].number, 1);
});

test('all 297 unchanged Android oracle fixtures preserve full rank, pins, corrections and topic suggestions', () => {
    const fixtures = json('tests/fixtures/android-search.json'); assert.equal(fixtures.seed, 20261105); assert.equal(fixtures.cases.length, 297);
    for (const c of fixtures.cases) {
        const r = c.kind === 'advanced' ? engine.advanced({ ...c, words: c.query }) : engine.search(c.query);
        assert.deepEqual([...r.pinned, ...r.hits.map(h => h.urn)], c.expected.urns, c.origin + ': ' + c.query);
        assert.deepEqual(r.pinned, c.expected.pinned, c.query);
        assert.deepEqual(r.corrections, c.expected.corrections, c.query);
        assert.deepEqual(engine.suggestTopics(c.query, 5).map(t => t.id), c.expected.topics, c.query);
        if (c.origin === 'seed-reference') assert.ok(r.pinned.includes(c.urn), c.query + ' resolves its actual corpus identity');
    }
});

test('Describe applies collection and grade filters strictly and keeps missing conditions honest', () => {
    for (const c of json('tests/fixtures/android-search.json').cases.filter(c => c.kind === 'advanced')) {
        const result = engine.describe({ words: c.query, name: c.name, collections: c.collections, grades: c.grades });
        for (const hit of result.hits) {
            const ref = engine.refs.get(engine.idOf.get(hit.urn));
            assert.ok(!c.collections.length || c.collections.includes(ref.collection));
            assert.ok(!c.grades.length || c.grades.includes(ref.cat || 'other'));
            assert.ok(!hit.missed.includes('collection') && !hit.missed.includes('grade'));
        }
    }
    const result = engine.describe({ words: 'cave potatoes airplane', collections: ['bukhari'], grades: ['sahih'] });
    if (result.hits.length) { assert.equal(result.allMatched, false); assert.ok(result.hits.every(h => h.missed.length)); }
    const key = Object.keys(json('data/v2/legacy.json'))[0];
    assert.equal(engine.search('https://hadithpull.online/h/?k=' + encodeURIComponent(key)).pinned[0], json('data/v2/legacy.json')[key]);
});
