import assert from 'node:assert/strict';
import { test } from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

test('worker skips superseded cold-start requests and only publishes the newest retrieval', async () => {
    let ready;
    const database = new Promise(resolve => { ready = resolve; }), searched = [], messages = [];
    const context = vm.createContext({ importScripts() {}, performance, Uint8Array, console, self: {},
        initSqlJs: async () => ({ Database: class { exec() {} } }),
        fetch: async url => ({ ok: true, arrayBuffer: () => database, json: async () => url.includes('taxonomy') ? { topics: [], situations: [] } : {} }),
        HadithSearch: { SearchEngine: class {
            search(query) { searched.push(query); return { pinned: [], hits: [{ urn: '10' }], corrections: {} }; }
            suggestTopics() { return []; } categoryMatches() { return []; }
        } }, postMessage: data => messages.push(data)
    });
    vm.runInContext(readFileSync(new URL('../search-worker.js', import.meta.url), 'utf8'), context);
    context.self.onmessage({ data: { id: 1, query: 'older', mode: 'search' } });
    await new Promise(setImmediate);
    context.self.onmessage({ data: { id: 2, query: 'newer', mode: 'search' } });
    ready(new ArrayBuffer(4)); await new Promise(setImmediate);
    assert.deepEqual(searched, ['newer']);
    assert.equal(messages.find(m => m.id === 1).error, 'Superseded search');
    assert.equal(messages.find(m => m.id === 2).result.hits[0].urn, '10');
});
