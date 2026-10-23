import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');

test('offline download includes existing shell files and uses the worker cache names', () => {
    const page = vm.createContext({ document: { getElementById: () => null }, navigator: {}, Promise });
    vm.runInContext(read('offline.js'), page);
    for (const file of vm.runInContext('OFFLINE_SHELL', page)) {
        const name = file.endsWith('/') ? file + 'index.html' : file;
        assert.ok(readFileSync(new URL(name.slice(1), root)).length, file);
    }
    const worker = vm.createContext({ self: { addEventListener() {} } });
    vm.runInContext(read('sw.js'), worker);
    assert.equal(vm.runInContext('OFFLINE_DATA_CACHE', page), vm.runInContext('DATA_CACHE', worker));
    assert.equal(vm.runInContext('OFFLINE_SHELL_CACHE', page), vm.runInContext('SHELL_CACHE', worker));
    assert.ok(read('navigation.js').includes('?v=' + vm.runInContext('OFFLINE_VERSION', page)), 'offline completion tracks the loaded script release');
    for (const file of ['index.html', 'about.html', 'bookmarks.html', 'privacy.html', 'whats-new.html', 'licenses.html', 'contact.html']) {
        const version = vm.runInContext('OFFLINE_VERSION', page);
        assert.ok(read(file).includes('href="style.css?v=' + version + '"'), file + ' uses the current stylesheet');
        assert.ok(read(file).includes('src="navigation.js?v=' + version + '"'), file + ' uses the matching navigation release');
    }
});

test('offline download cancels pending requests, preserves saved files, and can restart', async () => {
    const elements = new Map(['offline-save', 'offline-cancel', 'offline-status'].map(id => [id, {
        disabled: false, hidden: id === 'offline-cancel', textContent: '', dataset: {},
        addEventListener(name, callback) { this[name] = callback; }, focus() {}
    }]));
    const saved = new Map([['/existing-file', 'keep me']]);
    const cache = { match: async key => saved.get(key), put: async (key, response) => saved.set(key, await response.text()) };
    const pending = [];
    let started;
    const firstBatch = new Promise(resolve => { started = resolve; });
    let mode = 'pending';
    const context = vm.createContext({
        AbortController, Response, window: { caches: {} },
        document: { getElementById: id => elements.get(id) },
        navigator: { serviceWorker: { register: async () => ({}), ready: Promise.resolve() } },
        caches: { open: async () => cache },
        fetch: async (url, { signal, cache }) => {
            assert.equal(cache, 'reload');
            signal.throwIfAborted();
            if (url === '/data/v2/manifest.json') return new Response(JSON.stringify({ datasetId: 'test', files: { 'index.json': {} } }));
            if (mode === 'success') return new Response('saved');
            if (mode === 'failure') return new Response('Unavailable', { status: 503 });
            return new Promise((resolve, reject) => {
                pending.push(signal);
                signal.addEventListener('abort', () => reject(signal.reason), { once: true });
                if (pending.length === 4) started();
            });
        }
    });
    vm.runInContext(read('offline.js'), context);
    const button = elements.get('offline-save'), cancel = elements.get('offline-cancel'), status = elements.get('offline-status');
    const download = button.click();
    await firstBatch;
    assert.equal(button.disabled, true);
    assert.equal(button.textContent, 'Saving…');
    assert.equal(cancel.hidden, false);
    cancel.click();
    await download;
    assert.equal(pending.length, 4);
    assert.ok(pending.every(signal => signal.aborted));
    assert.equal(button.disabled, false);
    assert.equal(cancel.hidden, true);
    assert.match(status.textContent, /Download cancelled/);
    assert.equal(button.textContent, 'Make available offline');
    assert.equal(status.dataset.state, '');
    assert.equal(saved.has('/offline-ready'), false);
    assert.equal(saved.get('/existing-file'), 'keep me');

    mode = 'success';
    await button.click();
    assert.match(status.textContent, /^Ready\./);
    assert.equal(status.dataset.state, 'ready');
    assert.equal(button.textContent, 'Available offline');
    assert.equal(button.disabled, true);
    assert.equal(saved.get('/offline-ready'), vm.runInContext('OFFLINE_VERSION', context));

    mode = 'failure';
    await button.click();
    assert.match(status.textContent, /^Could not finish saving/);
    assert.equal(button.disabled, true);
    assert.equal(cancel.hidden, true);
    assert.equal(saved.get('/offline-ready'), vm.runInContext('OFFLINE_VERSION', context));
    assert.equal(button.textContent, 'Available offline');
    assert.equal(status.dataset.state, '');
});

test('offline copies show Available offline for the current version and offer updates only for older copies', async () => {
    for (const current of [true, false]) {
        const elements = new Map(['offline-save', 'offline-cancel', 'offline-status'].map(id => [id, {
            dataset: {}, addEventListener() {}
        }]));
        let savedVersion;
        const context = vm.createContext({
            document: { getElementById: id => elements.get(id) }, window: { caches: {} },
            navigator: { serviceWorker: { register: async () => ({}) } },
            caches: { open: async () => ({ match: async () => new Response(savedVersion) }) }, Response
        });
        vm.runInContext(read('offline.js'), context);
        savedVersion = current ? vm.runInContext('OFFLINE_VERSION', context) : 'older-dataset-marker';
        await new Promise(setImmediate);
        assert.equal(elements.get('offline-save').textContent, current ? 'Available offline' : 'Update offline copy');
        assert.equal(elements.get('offline-save').disabled, current);
        assert.equal(elements.get('offline-status').dataset.state, current ? 'ready' : '');
        assert.match(elements.get('offline-status').textContent, current ? /up to date/ : /earlier website version/);
    }
});

test('offline requests preserve shared identities, support clean page URLs, and never replace missing data with HTML', async () => {
    const handlers = new Map();
    const files = new Map([
        ['/', '<main>Reader shell</main>'],
        ['/about.html', '<main>About</main>'],
        ['/data/v2/bukhari/0.json', '[{"urn":"10"}]']
    ]);
    const cache = {
        match: async key => files.has(key) ? new Response(files.get(key)) : undefined,
        put: async (key, response) => files.set(key, await response.text())
    };
    const context = vm.createContext({
        URL, Response,
        caches: { open: async () => cache },
        fetch: async () => { throw Error('Offline'); },
        self: {
            location: { origin: 'https://hadithpull.online' },
            addEventListener: (name, callback) => handlers.set(name, callback)
        }
    });
    vm.runInContext(read('sw.js'), context);
    async function request(path) {
        let response;
        handlers.get('fetch')({ request: new Request('https://hadithpull.online' + path),
            respondWith: promise => { response = promise; } });
        return response;
    }
    assert.equal(await (await request('/?h=urn:10')).text(), '<main>Reader shell</main>');
    assert.equal(await (await request('/about')).text(), '<main>About</main>');
    assert.equal(await (await request('/data/v2/bukhari/0.json')).text(), '[{"urn":"10"}]');
    assert.equal((await request('/data/v2/missing/0.json')).type, 'error');
    let intercepted = false;
    handlers.get('fetch')({
        request: new Request('https://hadithpull.online/data/v2/index.json', { headers: { 'X-Hadith-Download': '1' } }),
        respondWith() { intercepted = true; }
    });
    assert.equal(intercepted, false, 'explicit downloads bypass the worker so the page can cancel their network requests');
});
