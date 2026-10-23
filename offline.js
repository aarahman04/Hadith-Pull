const OFFLINE_DATA_CACHE = 'hadith-pull-data-7ac043e2';
const OFFLINE_SHELL_CACHE = 'hadith-pull-shell-20261023';
const OFFLINE_SHELL = [
    '/', '/index.html', '/about.html', '/bookmarks.html', '/contact.html', '/privacy.html',
    '/licenses.html', '/whats-new.html', '/h/', '/style.css', '/script.js', '/card.js',
    '/bookmarks.js', '/offline.js', '/reminders.js', '/og-image.png',
    '/favicons/site.webmanifest', '/favicons/favicon.ico', '/favicons/favicon.svg',
    '/favicons/favicon-96x96.png', '/favicons/apple-touch-icon.png',
    '/favicons/web-app-manifest-192x192.png', '/favicons/web-app-manifest-512x512.png',
    '/fonts/inter_var.ttf', '/fonts/cormorant_garamond_var.ttf', '/fonts/amiri_regular.ttf',
    '/fonts/scheherazade_regular.ttf', '/fonts/noto_naskh_arabic_var.ttf',
    '/licenses/ofl_amiri.txt', '/licenses/ofl_cormorant_garamond.txt', '/licenses/ofl_inter.txt',
    '/licenses/ofl_noto_naskh_arabic.txt', '/licenses/ofl_scheherazade_new.txt'
];

const offlineButton = document.getElementById('offline-save');
const offlineStatus = document.getElementById('offline-status');
const offlineRegistration = 'serviceWorker' in navigator
    ? navigator.serviceWorker.register('/sw.js').catch(() => null) : Promise.resolve(null);

if (offlineButton) {
    if (!('serviceWorker' in navigator) || !('caches' in window)) {
        offlineButton.disabled = true;
        offlineStatus.textContent = 'Offline reading is unavailable in this browser. Open the site in Safari or Chrome to save it.';
    } else {
        caches.open(OFFLINE_DATA_CACHE).then(cache => cache.match('/offline-ready')).then(ready => {
            if (ready) offlineStatus.textContent = 'Saved on this device for offline reading.';
        }).catch(() => {});
        offlineButton.addEventListener('click', async () => {
            offlineButton.disabled = true;
            offlineStatus.textContent = 'Preparing the offline copy…';
            try {
                if (!await offlineRegistration) throw new Error('Offline support is unavailable');
                await navigator.serviceWorker.ready;
                const response = await fetch('/data/v2/manifest.json');
                if (!response.ok) throw new Error('Could not load the dataset manifest');
                const manifest = await response.json();
                const dataFiles = [...Object.keys(manifest.files), 'manifest.json', 'grades.json']
                    .map(file => '/data/v2/' + file);
                const files = [...OFFLINE_SHELL, ...dataFiles];
                let done = 0;
                for (let i = 0; i < files.length; i += 4) {
                    await Promise.all(files.slice(i, i + 4).map(async file => {
                        const cache = await caches.open(file.startsWith('/data/') ? OFFLINE_DATA_CACHE : OFFLINE_SHELL_CACHE);
                        await cache.add(file);
                        offlineStatus.textContent = `Saving for offline reading: ${Math.round(++done / files.length * 100)}%`;
                    }));
                }
                const cache = await caches.open(OFFLINE_DATA_CACHE);
                await cache.put('/offline-ready', new Response(manifest.datasetId));
                offlineStatus.textContent = 'Ready. All nine collections, your bookmarks and the website work offline on this device.';
            } catch {
                offlineStatus.textContent = 'Could not finish saving. Check your connection or available storage, then try again in Safari or Chrome.';
            } finally {
                offlineButton.disabled = false;
            }
        });
    }
}
