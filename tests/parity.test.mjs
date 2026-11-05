import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { withReportCors } from '../docs/report-server/cors.mjs';
const require = createRequire(import.meta.url);
const P = require('../parity-core.js'), O = require('../occasions.js');
const { Reports } = require('../reports.js');
const read = file => readFileSync(new URL('../' + file, import.meta.url));
const json = file => JSON.parse(read(file));
const model = new P.Categories(...['arrangement', 'taxonomy', 'labels', 'art', 'short-titles', 'finder'].map(n => json('data/topics/' + n + '.json')));

test('catalogue rows fill their width without orphaning a subject', () => {
    assert.deepEqual(P.balancedRows(4, 4), [4]);
    assert.deepEqual(P.balancedRows(10, 4), [4, 3, 3]);
    assert.deepEqual(P.balancedRows(4, 3), [2, 2]);
    for (const columns of [3, 4]) for (let count = 2; count < 50; count++) {
        const rows = P.balancedRows(count, columns);
        assert.equal(rows.reduce((a, b) => a + b, 0), count);
        assert.ok(rows.every(n => n >= 2 && n <= columns));
    }
});

test('release data hashes cover every authoritative and derived browser asset', () => {
    const manifest = json('data/parity-manifest.json');
    for (const [file, hash] of Object.entries(manifest.files)) assert.equal(createHash('sha256').update(read(file)).digest('hex'), hash, file);
    for (const file of ['data/topics/art.json', 'data/reading-pools.json', 'data/daily-sayings.json', 'data/search/v1/search.db', 'data/notifications/umm-al-qura.json']) assert.ok(manifest.files[file], file);
    const android = new URL('../../Hadith-Pull-Android/app/src/main/assets/', import.meta.url);
    for (const [web, source] of [['data/v2/pools.txt', 'hadith/v2/pools.txt'], ['data/topics/arrangement.json', 'topics/arrangement.json'], ['data/topics/labels.json', 'topics/labels.json'], ['data/search/v1/search.db', 'search/v1/search.db']]) {
        if (existsSync(new URL(source, android))) assert.deepEqual(read(web), readFileSync(new URL(source, android)), source);
    }
});

test('arrangement drives shelves, deduplicated members, hidden entries and retired choices', () => {
    assert.equal(model.cards.length, 44);
    assert.equal(model.cards.reduce((n, c) => n + c.groups.reduce((n, g) => n + g.tiles.length, 0), 0), 362);
    assert.equal(model.tiles.length, 348);
    assert.ok(model.cards.every(c => model.urns(c.id).length));
    assert.ok(model.cards.findIndex(c => c.id === 'purification') < model.cards.findIndex(c => c.id === 'prayer'));
    assert.ok(model.card('congregation-mosques') && model.card('special-prayers'));
    assert.equal(model.saved('congregation-mosques'), 'congregation-mosques');
    for (const [retired, current] of Object.entries(model.spec.moved)) assert.equal(model.saved(retired), current);
    assert.equal(model.saved('<script>'), null); assert.equal(model.saved('not-a-topic'), null);
    assert.equal(model.card('children-space').tiles.length, 4);
    assert.ok(!model.card('children-space').tiles.some(t => t.id === 'conflict-with-family'));
    assert.deepEqual(model.card('relatives-space').tiles.map(t => t.id), ['kinship-ties', 'conflict-with-family']);
    assert.ok(!model.card('family').tiles.some(t => ['kinship-ties', 'conflict-with-family', 'parents'].includes(t.id)));
    assert.ok(model.card('parents-space').tiles.some(t => t.id === 'parents'));
    assert.equal(model.card('society-space').icon, model.art.named.Justice);
    assert.equal(model.art.named.Justice, 'injusticeLogo');
    for (const hidden of Object.keys(model.spec.hidden)) assert.ok(!model.tiles.some(t => t.id === hidden));
    for (const c of model.cards) assert.equal(model.urns(c.id).length, new Set(c.tiles.flatMap(t => model.labels[t.id] || [])).size);
    assert.ok(model.find('my father is ill').some(c => c.id === 'parents'));
    assert.ok(model.find('Purity Cleanliness').some(c => c.id === 'purification'));
    assert.equal(model.cards.find(c => c.tiles.length === 1).tiles[0].id, 'earlier-prophets');
});

test('grid labels are two real lines and approved parent marks are separate path exports', () => {
    for (const c of model.cards.filter(c => !c.wide)) { const lines = c.gridTitle.split('\n'); assert.equal(lines.length, 2, c.id); assert.ok(lines.every(l => l.trim()), c.id); }
    const art = model.art;
    assert.notEqual(art.named.Parents, art.named.Home);
    assert.ok(art.svg.parentsLogo.includes('M7.2 2.3a2 2'));
    assert.ok(art.svg.parentingLogo.includes('M12 9a2'));
    for (const c of model.cards) assert.ok(art.svg[c.icon], c.id);
    assert.ok(!art.svg.nightPrayerLogo.includes('<text'));
    assert.equal(new Set(['faith', 'fasting', 'special-prayers'].map(id => art.categories[id])).size, 3);
});

test('topic browsing matches short prefixes while typing husband and clearing has no results', () => {
    for (const query of ['h', 'hu', 'hus', 'husb', 'husband']) {
        const found = model.find(query).map(c => c.id);
        assert.ok(found.includes('husband-role') && found.includes('spousal-rights'), query);
    }
    assert.deepEqual(model.find('   '), []);
});

test('source draws retain grade, deduplicate membership, avoid current and use defined fallbacks', () => {
    const grades = { 1: 's', 2: 's', 3: 'o', 4: 'n' };
    assert.deepEqual(P.sourceCandidates(['1', '1', '2', '3'], grades, 's', 'urn:1'), ['2']);
    assert.deepEqual(P.sourceCandidates(['3', '4'], grades, 's', null), ['3', '4']);
    assert.deepEqual(P.sourceCandidates(['1', '3'], grades, 's', 'urn:1'), ['3']);
    assert.deepEqual(P.sourceCandidates(['1'], grades, 's', 'urn:1'), ['1']);
    assert.deepEqual(P.sourceCandidates([], grades, 's', null), []);
    const pools = json('data/reading-pools.json');
    for (const c of model.cards) assert.ok(model.urns(c.id).every(u => pools.grades[u]), c.id);
});

test('history keeps ten previous canonical identities and query recents save only used queries', () => {
    let history = [];
    for (let i = 1; i <= 20; i++) history = P.historyAfterDisplay(history, 'urn:' + i);
    assert.equal(history.length, 11); assert.equal(history.filter(k => k !== 'urn:20').length, 10);
    history = P.historyAfterDisplay(history, 'urn:12'); assert.equal(history[0], 'urn:12'); assert.equal(new Set(history).size, 11);
    let queries = [];
    for (const q of ['one', 'two', 'three', 'four', 'five', 'six', ' TWO ']) queries = P.queryAfterUse(queries, q);
    assert.deepEqual(queries, ['TWO', 'six', 'five', 'four', 'three']);
    assert.deepEqual(P.queryAfterUse(queries, ' '), queries);
    const ui = read('search.js').toString();
    assert.ok(ui.includes('id !== serial'));
    assert.ok(!ui.match(/input\.addEventListener\('input',[\s\S]{0,120}keep\(/));
});

test('unavailable/full local storage and malformed new history do not break local reading models', () => {
    const previous = globalThis.localStorage;
    globalThis.localStorage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('full'); } };
    try {
        assert.equal(P.Local.get('blocked-test', null), null);
        assert.equal(P.Local.set('blocked-test', 'source'), false);
        assert.equal(P.Local.get('blocked-test'), 'source');
        assert.deepEqual(P.historyAfterDisplay('corrupt', 'urn:10'), ['urn:10']);
        assert.deepEqual(P.queryAfterUse({ unexpected: true }, 'mercy'), ['mercy']);
    } finally { globalThis.localStorage = previous; }
});

function store() { let data = {}; return { get: (k, fallback) => structuredClone(data[k] ?? fallback), set(k, v) { data[k] = structuredClone(v); return true; } }; }
const uuid = () => 'c0197280-97e8-44d6-9ac4-2d72915197cf';
test('reports persist exact minimal payloads, deduplicate and retry transient failures with backoff', async () => {
    let now = 1700000000000, status = 429; const sent = [];
    const repo = new Reports(store(), { endpoint: 'https://mock.invalid', now: () => now, uuid, send: async (url, options) => { sent.push([url, JSON.parse(options.body)]); return { status }; } });
    assert.equal(await repo.enqueue('10', 'pillars-of-faith', 'not-about'), 'Reported · thank you');
    assert.deepEqual(Object.keys(sent[0][1]).sort(), ['app', 'install', 'reason', 'topic', 'urn']);
    assert.equal(sent[0][1].urn, '10'); assert.equal(sent[0][1].install, uuid());
    await repo.enqueue('10', 'pillars-of-faith', 'passing'); assert.equal(sent.length, 1);
    await repo.flush(); assert.equal(sent.length, 1);
    now += 60000; status = 503; await repo.flush(); assert.equal(sent.length, 2);
    now += 119999; await repo.flush(); assert.equal(sent.length, 2);
    now++; status = 204; await repo.flush(); assert.equal(sent.length, 3); assert.equal(repo.status('10', 'pillars-of-faith'), 'Reported · thank you');
    assert.equal(await new Reports(repo.store, { uuid }).enqueue('10', 'pillars-of-faith'), 'Reported · thank you');
    await assert.rejects(() => repo.enqueue('urn:10', 'prophet', 'other'));
    await assert.rejects(() => repo.enqueue('10', 'pillars-of-faith', 'arbitrary free text'));
});
test('reports distinguish permanent rejection, expiry, offline/CORS failure and unavailable storage', async () => {
    let now = 1; const storage = store();
    const repo = new Reports(storage, { now: () => now, uuid });
    assert.equal(await repo.enqueue('10', 'pillars-of-faith'), 'Reported · thank you'); now += 30 * 86400000;
    await repo.flush(); assert.equal(repo.status('10', 'pillars-of-faith'), 'Report expired');
    const rejected = new Reports(store(), { uuid, endpoint: 'https://mock.invalid', send: async () => ({ status: 400 }) });
    assert.equal(await rejected.enqueue('20', 'pillars-of-faith'), 'Report declined');
    const cors = new Reports(store(), { uuid, endpoint: 'https://mock.invalid', send: async () => { throw Error('CORS'); } });
    assert.equal(await cors.enqueue('30', 'pillars-of-faith'), 'Reported · thank you');
    const denied = new Reports({ ...store(), set() { return false; } }, { uuid });
    assert.match(await denied.enqueue('40', 'pillars-of-faith'), /storage is unavailable/);
});

test('a report queued while another is sending survives and is delivered on the next flush', async () => {
    let finish, calls = 0; const first = new Promise(resolve => { finish = resolve; });
    const repo = new Reports(store(), { uuid, endpoint: 'https://mock.invalid', send: async () => { calls++; return calls === 1 ? first : { status: 204 }; } });
    const sending = repo.enqueue('10', 'pillars-of-faith'); await new Promise(setImmediate);
    assert.equal(await repo.enqueue('20', 'pillars-of-faith'), 'Reported · thank you');
    finish({ status: 204 }); await sending;
    assert.equal(repo.status('10', 'pillars-of-faith'), 'Reported · thank you'); assert.equal(repo.status('20', 'pillars-of-faith'), 'Reported · thank you');
    await repo.flush(); assert.equal(repo.status('20', 'pillars-of-faith'), 'Reported · thank you');
});
test('CORS patch allowlists report preflights and errors while retaining native/admin behavior', async () => {
    let called = 0; const handle = withReportCors(async () => { called++; return new Response(null, { status: 429 }); });
    const req = (origin, method = 'OPTIONS', path = '/report', headers = {}) => new Request('https://mock.invalid' + path, { method, headers: { ...(origin ? { Origin: origin } : {}), 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type', ...headers } });
    const preflight = await handle(req('https://hadithpull.online'));
    assert.equal(preflight.status, 204); assert.equal(called, 0); assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), 'https://hadithpull.online');
    assert.equal((await handle(req('https://evil.invalid'))).status, 403);
    assert.equal((await handle(req('https://hadithpull.online', 'OPTIONS', '/report', { 'Access-Control-Request-Headers': 'authorization' }))).status, 403);
    const error = await handle(req('https://hadithpull.online', 'POST')); assert.equal(error.status, 429); assert.equal(error.headers.get('Vary'), 'Origin');
    assert.equal((await handle(req(null, 'POST'))).status, 429);
    assert.equal((await handle(req('https://hadithpull.online', 'GET', '/counts'))).headers.get('Access-Control-Allow-Origin'), null);
});

test('offline Umm al-Qura boundaries and adjustments match the exported JVM month starts', () => {
    const table = json('data/notifications/umm-al-qura.json');
    for (let i = 1; i < table.length - 1; i++) {
        const [epoch, year, month] = table[i], d = O.fromEpoch(epoch);
        assert.deepEqual(O.hijri(d, 0, table), { year, month, day: 1 });
        assert.deepEqual(O.hijri(O.fromEpoch(epoch - 1), 1, table), { year, month, day: 1 });
        assert.equal(O.hijri(d, -1, table).day, epoch - table[i - 1][0]);
    }
    assert.equal(O.hijri(O.fromEpoch(table[0][0] - 1), 0, table), null);
    assert.equal(O.hijri(O.fromEpoch(table.at(-1)[0]), 0, table), null);
});

test('occasion slots honor priorities, evening-before dates, Ramadan and forbidden-day exclusions', () => {
    const table = json('data/notifications/umm-al-qura.json'), occasions = json('data/notifications/occasions.json').occasions;
    const s = { slots: [{ id: 'morning', on: true, time: '07:00' }, { id: 'afternoon', on: true, time: '15:00' }, { id: 'night', on: true, time: '21:00' }], specialDaysOn: true, recurringFastsOn: true, hijriAdjustment: 0, pool: 'BUKHARI_MUSLIM' };
    const recurring = occasions.filter(o => o.category === 'recurring_fast'); assert.ok(recurring.length >= 3);
    const start = O.epoch(new Date(2026, 0, 1));
    for (let day = start; day < start + 800; day++) {
        const date = O.fromEpoch(day), plan = O.plan(date, s, occasions, table); assert.ok(Object.keys(plan).length <= 3);
        for (const o of recurring) if (O.matches(o, date, 0, table)) {
            const h = O.hijri(O.fromEpoch(day + 1), 0, table); assert.ok(h.month !== 9); assert.ok(!O.forbidden(h)); assert.equal(o.dayOffset, -1);
        }
    }
    const friday = new Date(2026, 10, 6); assert.ok(Object.values(O.plan(friday, s, occasions, table)).some(o => o?.category === 'friday'));
    const calendar = O.calendar(s, occasions, table, json('data/reading-pools.json').daily, new Date(2026, 10, 5, 22), 40);
    assert.ok(calendar.includes('BEGIN:VALARM')); assert.ok(!calendar.includes('RRULE:'));
    assert.ok(calendar.includes('evening') || calendar.includes('Monday') || calendar.includes('Monday'.toLowerCase()));
    assert.ok(calendar.includes('https://hadithpull.online/h/?k=urn%3A'));
    for (const line of calendar.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
    const sayings = json('data/daily-sayings.json'), pool = json('data/reading-pools.json').widget;
    assert.equal(new Set(sayings.map(q => q.urn)).size, pool.length); assert.deepEqual(new Set(sayings.map(q => q.urn)), new Set(pool));
    assert.ok(sayings.every(q => q.text.length >= 60 && q.text.length <= 340));
});

test('daily reminder selection preserves the 48-attempt readable preference and 365-day repeat rule', () => {
    const candidates = [['10', 'bukhari', 200, true], ['20', 'muslim', 700, false], ['30', 'muslim', 200, true]];
    const picks = [.4, 0];
    assert.equal(O.pickDaily(candidates, [], 1000, () => picks.shift())[0], '10');
    assert.equal(O.pickDaily(candidates, [{ urn: '10', day: 999 }], 1000, () => 0)[0], '20');
    assert.equal(O.pickDaily(candidates, [{ urn: '10', day: 635 }], 1000, () => 0)[0], '10');
    assert.equal(O.pickDaily(candidates, [{ urn: '10', day: 995 }, { urn: '20', day: 998 }, { urn: '30', day: 999 }], 1000, () => 0)[0], '10');
    assert.equal(O.pickDaily([], [], 1000), null);
    const table = json('data/notifications/umm-al-qura.json');
    assert.throws(() => O.calendar({ slots: [{ id: 'night', on: true, time: '25:00' }], hijriAdjustment: 0 }, [], table, []), /valid time/);
});
