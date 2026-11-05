const DATA_CACHE = 'hadith-pull-data-7ac043e2';
const SHELL_CACHE = 'hadith-pull-shell-20261105-parity-19';
const META_CACHE = 'hadith-pull-meta-20261105-parity-19';
const RELEASE = '20261105-parity-19';

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
    // The page caches explicit downloads itself; bypassing the worker lets Cancel stop the network request.
    if (event.request.headers.get('X-Hadith-Download') === '1') return;
    event.respondWith((async () => {
        const isData = url.pathname.startsWith('/data/');
        // Corpus shards are immutable for a dataset ID. Pools, grades, taxonomy and search are versioned separately.
        const isCorpus = /^\/data\/v2\/[a-z0-9]+\/\d+\.json$/.test(url.pathname);
        const cache = await caches.open(isCorpus ? DATA_CACHE : isData ? META_CACHE : SHELL_CACHE);
        // Shared links carry the identity in the URL; the HTML shell is the same for every key.
        const key = url.pathname;
        const cached = await cache.match(key) ||
            (!key.split('/').pop().includes('.') && await cache.match(key + '.html'));
        if (isData && cached) return cached;
        try {
            const response = await fetch(event.request);
            if (response.ok) {
                try { await cache.put(key, response.clone()); } catch { /* Storage may be full; keep the online response usable. */ }
            }
            return response;
        } catch {
            // A cancelled update must not strand the previous completed offline copy.
            const ready = await (await caches.open(DATA_CACHE)).match('/offline-ready');
            if (ready) {
                const version = await ready.text();
                const oldCache = await caches.open('hadith-pull-' + (isData ? 'meta-' : 'shell-') + version);
                const previous = await oldCache.match(key) || (!key.split('/').pop().includes('.') && await oldCache.match(key + '.html'));
                // Use one complete older shell, not a partially downloaded new HTML/JS mixture.
                if (previous && (version !== RELEASE || !cached)) return previous;
                if (isData && key.startsWith('/data/v2/') && version.startsWith('202610')) {
                    const legacy = await (await caches.open(DATA_CACHE)).match(key);
                    if (legacy) return legacy;
                }
            }
            return cached || Response.error();
        }
    })());
});
