const DATA_CACHE = 'hadith-pull-data-7ac043e2';
const SHELL_CACHE = 'hadith-pull-shell-20261023-navigation';

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
    // The page caches explicit downloads itself; bypassing the worker lets Cancel stop the network request.
    if (event.request.headers.get('X-Hadith-Download') === '1') return;
    event.respondWith((async () => {
        const isData = url.pathname.startsWith('/data/v2/');
        const cache = await caches.open(isData ? DATA_CACHE : SHELL_CACHE);
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
            return cached || Response.error();
        }
    })());
});
