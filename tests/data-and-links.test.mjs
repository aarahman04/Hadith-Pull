import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');

function reader(document = { getElementById: () => null, addEventListener() {} }) {
    const values = new Map();
    const requests = [];
    const context = vm.createContext({
        console, URL, URLSearchParams, performance, setTimeout, clearTimeout,
        File, Blob,
        document,
        addEventListener() {},
        navigator: {},
        location: new URL('https://hadithpull.online/?h=urn:10'),
        localStorage: {
            getItem: key => values.get(key) ?? null,
            setItem: (key, value) => values.set(key, String(value)),
            removeItem: key => values.delete(key)
        },
        fetch: async file => {
            requests.push(file);
            return { ok: true, json: async () => JSON.parse(read(file)) };
        }
    });
    context.window = context;
    context.history = { replaceState: (_, __, url) => { context.location = new URL(url, context.location); } };
    vm.runInContext(read('script.js'), context);
    vm.runInContext(read('bookmarks.js'), context);
    return { context, requests, run: code => vm.runInContext(code, context) };
}

test('the reader separates the reference for desktop layout while preserving the inline label', () => {
    const summary = {
        text: '', children: [],
        set textContent(value) { this.text = value; this.children = []; },
        get textContent() { return this.text + this.children.map(child => child.textContent).join(''); },
        append(...children) { this.children.push(...children); }
    };
    const { run } = reader({
        getElementById: id => id === 'brief-main' ? summary : null,
        createElement: () => ({}), addEventListener() {}
    });
    run("paintBrief({collectionTitle: 'Sahih al-Bukhari', ref: '2298'})");
    assert.equal(summary.textContent, 'Sahih al-Bukhari · Hadith 2298');
    assert.equal(summary.children.find(child => child.className === 'brief-number').textContent, 'Hadith 2298');
    run("paintBrief({collectionTitle: 'Another collection', ref: ''})");
    assert.equal(summary.textContent, 'Another collection');
    assert.equal(summary.children.length, 0);
    run('paintBrief(null)');
    assert.equal(summary.textContent, '');
});

test('Sunnah.com URNs resolve to the exact record, including every shard boundary', async () => {
    const { run } = reader();
    const index = JSON.parse(read('data/v2/index.json'));
    for (const c of index.collections) {
        for (const s of c.shards) {
            const records = JSON.parse(read(`data/v2/${c.id}/${s.k}.json`));
            for (const record of [records[0], records.at(-1)]) {
                const found = await run(`findRecord('urn:${record.urn}')`);
                assert.equal(found?.collection.id, c.id);
                assert.equal(found?.record.english, record.english);
                assert.equal(found?.record.urn, record.urn);
            }
        }
    }
});

test('all supported legacy links resolve through the audited identity map', async () => {
    const { run } = reader();
    const legacy = JSON.parse(read('data/v2/legacy.json'));
    for (const [key, urn] of Object.entries(legacy)) {
        const found = await run(`findRecord(${JSON.stringify(key)})`);
        assert.equal(found?.record.urn, urn, key);
    }
});

test('missing, malformed, and excluded shared links never show a random Hadith', async () => {
    const { context, run } = reader();
    run('setLoading = () => {}; displayHadith = () => { throw Error("Wrong Hadith displayed"); }; draw = () => { throw Error("Random fallback"); }; showError = message => { window.errorMessage = message; };');
    for (const key of ['', 'urn:0', 'urn:11', 'urn:nope', 'urn:9999999999', 'unknown:1', 'malik:1']) {
        await run(`openShared(${JSON.stringify(key)})`);
        assert.match(context.errorMessage, /shared Hadith/i);
    }
});

test('failed index requests can be retried', async () => {
    const { context, run } = reader();
    const fetch = context.fetch;
    context.fetch = async () => { throw Error('offline'); };
    await assert.rejects(run('loadIndex()'), /offline/);
    context.fetch = fetch;
    assert.ok((await run('loadIndex()')).collections.length);
});

test('new Hadiths use stable URN keys and Sunnah.com URLs', async () => {
    const { run } = reader();
    const hadith = await run("findRecord('urn:10').then(f => toHadith(f.record, f.collection))");
    assert.equal(hadith.key, 'urn:10');
    assert.equal(hadith.sunnahUrl, 'https://sunnah.com/urn/10');
    assert.equal(run("hadithLink('urn:10')"), 'https://hadithpull.online/h/?k=urn:10');
});

test('Android library imports accept URNs and old keys without trusting supplied text', async () => {
    const { context, run } = reader();
    context.libraryDoc = { folders: [{ name: 'From Android', items: [
        { key: 'urn:800010', english: 'Untrusted text' }, { key: 'abudawud:1' }, { key: 'urn:0' }
    ] }] };
    const result = await run('Library.apply(libraryDoc)');
    assert.equal(result.added, 1, JSON.stringify(result));
    assert.equal(result.alreadySaved, 1);
    assert.equal(result.notFound, 1);
    assert.equal(run('BookmarkStore.getItems(BookmarkStore.getFolders()[0].id)[0].key'), 'urn:800010');
    assert.notEqual(run('BookmarkStore.getItems(BookmarkStore.getFolders()[0].id)[0].english'), 'Untrusted text');
    const file = run('Library.file()');
    const parsed = run(`Library.parse(${JSON.stringify(await file.text())}, ${file.size})`);
    assert.equal(parsed.ok.version, 2);
    assert.equal(parsed.ok.folders[0].items[0].key, 'urn:800010');
});

test('shipped files match the Android manifest and grade filters match every record', () => {
    const manifest = JSON.parse(read('data/v2/manifest.json'));
    const index = JSON.parse(read('data/v2/index.json'));
    assert.equal(index.source.name, 'sunnah.com');
    assert.equal(index.datasetId, manifest.datasetId);
    for (const [file, expected] of Object.entries(manifest.files)) {
        const bytes = readFileSync(new URL(`data/v2/${file}`, root));
        assert.equal(createHash('sha256').update(bytes).digest('hex'), expected, file);
    }
    const grades = JSON.parse(read('data/v2/grades.json'));
    const eligible = new Map(read('data/v2/pools.txt').trim().split(/\r?\n/).slice(1).map(line => {
        const [collection, shard, ...entries] = line.split(' ');
        return [`${collection}/${shard}`, new Set(entries.map(entry => Number(entry.split('.')[0])))];
    }));
    for (const c of index.collections) {
        const records = c.shards.flatMap(s => JSON.parse(read(`data/v2/${c.id}/${s.k}.json`)));
        assert.equal(records.length, c.count);
        const expected = records.map((r, i) => !eligible.get(`${c.id}/${Math.floor(i / 250)}`)?.has(i % 250) ? '-'
            : !r.primary ? 'n' : r.primary.cat === 'sahih' ? 's' : 'o').join('');
        assert.equal(grades[c.id], expected, c.id);
    }
});

test('draws default to Sahih, respect every grade filter, and exclude the current Hadith', async () => {
    const { context, run } = reader();
    assert.equal(run('gradeFilter().key'), 'sahih');
    run('Math.random = () => 0;');
    for (const [filter, category] of [['all', null], ['sahih', 's'], ['other', 'o'], ['none', 'n']]) {
        context.localStorage.setItem('gradeFilter', filter);
        const first = await run('pickRecord()');
        const expected = !first.record.primary ? 'n' : first.record.primary.cat === 'sahih' ? 's' : 'o';
        if (category) assert.equal(expected, category);
        context.picked = first;
        run('current = toHadith(picked.record, picked.collection); currentPosition = picked.position;');
        const second = await run('pickRecord()');
        assert.notEqual(second.record.urn, first.record.urn, filter);
        run('current = null; currentPosition = null;');
    }
});

test('calendar reminders use local daily times, include alarms, and reject invalid input', () => {
    const { context, run } = reader();
    vm.runInContext(read('reminders.js'), context);
    context.now = new Date(2026, 9, 23, 8, 0);
    const calendar = run("reminderCalendar([{id:'morning',time:'07:00'},{id:'night',time:'21:00'}], now)");
    assert.match(calendar, /DTSTART:20261024T070000\r\n/);
    assert.match(calendar, /DTSTART:20261023T210000\r\n/);
    assert.equal(calendar.match(/RRULE:FREQ=DAILY/g).length, 2);
    assert.equal(calendar.match(/BEGIN:VALARM/g).length, 2);
    assert.ok(calendar.endsWith('END:VCALENDAR\r\n'));
    for (const input of ['[]', "[{id:'morning',time:'07:99'}]", "[{id:'morning',time:'15:00'}]", "[{id:'night',time:'21:00\\r\\nBAD'}]"]) {
        assert.throws(() => run(`reminderCalendar(${input}, now)`));
    }
});

test('clicking any reminder time field opens its picker and preserves native fallback behavior', () => {
    for (const support of ['supported', 'missing', 'blocked']) {
        const elements = new Map([['reminder-form', { addEventListener() {} }]]);
        let opened = 0;
        for (const slot of ['morning', 'afternoon', 'night']) {
            const input = { events: {}, addEventListener(name, callback) { this.events[name] = callback; } };
            if (support !== 'missing') input.showPicker = () => {
                opened++;
                if (support === 'blocked') throw new Error('Picker unavailable');
            };
            elements.set(`reminder-${slot}-time`, input);
        }
        const { context } = reader({ getElementById: id => elements.get(id), addEventListener() {} });
        vm.runInContext(read('reminders.js'), context);
        let prevented = false;
        for (const input of [...elements.values()].filter(element => element.events)) {
            assert.deepEqual(Object.keys(input.events), ['click'], 'focus and keyboard editing keep native behavior');
            assert.doesNotThrow(() => input.events.click({ preventDefault() { prevented = true; } }));
        }
        assert.equal(opened, support === 'missing' ? 0 : 3);
        assert.equal(prevented, support === 'supported', 'only a successfully opened picker cancels the segment click that would close it');
    }
});
