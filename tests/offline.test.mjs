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
});
