/* All database work stays on this worker; assets load on first search, never on initial Read. */
importScripts('vendor/sqljs/sql-wasm.js', 'search-engine.js');
let enginePromise;
async function engine() {
    if (!enginePromise) enginePromise = (async () => {
        const started = performance.now();
        const [SQL, bytes, labels, taxonomy, legacy] = await Promise.all([
            initSqlJs({ locateFile: file => 'vendor/sqljs/' + file }),
            fetch('data/search/v1/search.db').then(r => { if (!r.ok) throw Error('Search download failed'); return r.arrayBuffer(); }),
            ...['data/topics/labels.json', 'data/topics/taxonomy.json', 'data/v2/legacy.json'].map(url => fetch(url).then(r => { if (!r.ok) throw Error('Search metadata unavailable'); return r.json(); }))
        ]);
        const db = new SQL.Database(new Uint8Array(bytes));
        // Check the required tokenizer/index features against the actual shipped DB.
        db.exec("SELECT docid,matchinfo(en,'pcnalx') FROM en WHERE en MATCH 'intentions' LIMIT 1");
        const instance = new HadithSearch.SearchEngine(db, labels, taxonomy, legacy);
        postMessage({ metrics: { coldMs: performance.now() - started, databaseBytes: bytes.byteLength } });
        return instance;
    })().catch(error => { enginePromise = null; throw error; });
    return enginePromise;
}
let tail = Promise.resolve();
let newest = 0;
self.onmessage = ({ data }) => {
    newest = Math.max(newest, data.id);
    tail = tail.catch(() => {}).then(async () => {
        try {
            const e = await engine(), start = performance.now();
            if (data.id !== newest) { postMessage({ id: data.id, error: 'Superseded search' }); return; }
            const result = data.mode === 'describe' ? e.describe(data.request) : e.search(data.query);
            const suggestions = result.pinned.length ? [] : data.mode === 'describe' ? e.suggestTopics(data.query, 5) : [...e.categoryMatches(data.query), ...e.suggestTopics(data.query, 3)].slice(0, 3);
            postMessage({ id: data.id, result, suggestions, elapsedMs: performance.now() - start });
        } catch (error) { postMessage({ id: data.id, error: error.message }); }
    });
};
