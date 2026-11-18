import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const json = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));

// narrators.js as the browser runs it, reading the shards from disk.
function load() {
    const context = {
        TextEncoder, console,
        document: { addEventListener() {}, getElementById: () => null },
        fetch: async path => ({ ok: existsSync(new URL(path, root)), json: async () => json(path) }),
    };
    vm.createContext(context);
    vm.runInContext(readFileSync(new URL('narrators.js', root), 'utf8') + '\nthis.Narrators = Narrators;', context);
    return context.Narrators;
}

test('the shards hold every report, person and title, each in the shard the browser looks in', () => {
    const index = json('data/narrators/v1/index.json');
    const Narrators = load();
    let reports = 0, people = 0, titles = 0;
    for (const k of readdirSync(new URL('data/narrators/v1/chains/', root))) {
        for (const urn of Object.keys(json('data/narrators/v1/chains/' + k))) { assert.equal(`${Number(urn) % index.chains}.json`, k); reports++; }
    }
    for (const k of readdirSync(new URL('data/narrators/v1/people/', root))) {
        for (const id of Object.keys(json('data/narrators/v1/people/' + k))) { assert.equal(`${Narrators.shardOf(id, index.people)}.json`, k); people++; }
    }
    for (const k of readdirSync(new URL('data/narrators/v1/titles/', root))) titles += Object.keys(json('data/narrators/v1/titles/' + k)).length;
    assert.equal(reports, 33420);
    assert.equal(titles, reports);
    assert.equal(people, Object.keys(index.names).length);
    assert.equal(people, 10652);
});

test('Bukhari 1 runs from ʿUmar to al-Bukhārī with the wording and the compiler note', async () => {
    const Narrators = load(), index = json('data/narrators/v1/index.json');
    const report = await Narrators.report('urn:10');
    assert.equal(report.t, 'Bukhari 1 · Actions and intentions');
    const [[number, prophet, , end, steps]] = report.r;
    assert.equal(number, 1); assert.equal(prophet, 1);
    assert.deepEqual(steps.map(s => s[0]), ['umar', 'alqama', 'taymi', 'yahya', 'ibn-uyayna', 'humaydi', 't5727']);
    assert.equal(steps[0][1], 'سَمِعْتُ');
    assert.equal(index.notes[end], 'The last name is the compiler, who wrote this hadith down in his book.');
});

test('gap markers and names kept as written have no profile name of their own', () => {
    const { names } = json('data/narrators/v1/index.json');
    for (const gap of ['aj30000', 'aj30001', 'aj30002', 'aj1131']) assert.notEqual(names[gap][0], names[gap][1], gap);
    const written = Object.keys(names).filter(id => /^w\d+-\d+$/.test(id));
    assert.ok(written.length >= 50);
    for (const id of written) assert.equal(names[id][0], names[id][1], id);
});

test('Shuʿbah keeps every verdict with its source, and his students most-taught first', async () => {
    const Narrators = load(), index = json('data/narrators/v1/index.json');
    const shuba = await Narrators.profile('shuba');
    assert.ok(shuba.as.length >= 20);
    for (const [critic, arabic, meaning, [work]] of shuba.as) { assert.ok(critic && arabic && meaning); assert.ok(index.works[work]); }
    const counts = shuba.stu.map(([id]) => index.names[id][3]);
    assert.deepEqual(counts, [...counts].sort((a, b) => b - a));
    assert.ok(shuba.car.length > 1000);
});

test('the shards match the Android database when it is beside this repository', { skip: !existsSync(new URL('../Hadith-Pull-Android/app/src/main/assets/science-of-hadith/version.txt', root)) }, () => {
    const version = readFileSync(new URL('../Hadith-Pull-Android/app/src/main/assets/science-of-hadith/version.txt', root), 'utf8').trim();
    assert.equal(json('data/narrators/v1/index.json').version, version);
});
