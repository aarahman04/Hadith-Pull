const OFFLINE_DATA_CACHE = 'hadith-pull-data-7ac043e2';
const OFFLINE_SHELL_CACHE = 'hadith-pull-shell-20261023-navigation';
const OFFLINE_VERSION = '20261023-navigation-3';
const OFFLINE_SHELL = [
    '/', '/index.html', '/about.html', '/bookmarks.html', '/contact.html', '/privacy.html',
    '/licenses.html', '/whats-new.html', '/h/', '/style.css', '/script.js', '/card.js',
    '/bookmarks.js', '/navigation.js', '/offline.js', '/reminders.js', '/og-image.png',
    '/favicons/site.webmanifest', '/favicons/favicon.ico', '/favicons/favicon.svg',
    '/favicons/favicon-96x96.png', '/favicons/apple-touch-icon.png',
    '/favicons/web-app-manifest-192x192.png', '/favicons/web-app-manifest-512x512.png',
    '/fonts/inter_var.ttf', '/fonts/cormorant_garamond_var.ttf', '/fonts/amiri_regular.ttf',
    '/fonts/scheherazade_regular.ttf', '/fonts/noto_naskh_arabic_var.ttf',
    '/licenses/ofl_amiri.txt', '/licenses/ofl_cormorant_garamond.txt', '/licenses/ofl_inter.txt',
    '/licenses/ofl_noto_naskh_arabic.txt', '/licenses/ofl_scheherazade_new.txt'
];

const offlineButton = document.getElementById('offline-save');
const offlineCancel = document.getElementById('offline-cancel');
const offlineStatus = document.getElementById('offline-status');
const offlineRegistration = 'serviceWorker' in navigator
    ? navigator.serviceWorker.register('/sw.js').catch(() => null) : Promise.resolve(null);

if (offlineButton) {
    if (!('serviceWorker' in navigator) || !('caches' in window)) {
        offlineButton.disabled = true;
        offlineStatus.textContent = 'Offline reading is unavailable in this browser. Open the site in Safari or Chrome to save it.';
    } else {
        let download;
        let hasOfflineCopy = false;
        let hasCurrentOfflineCopy = false;
        offlineCancel.addEventListener('click', () => download?.abort());
        caches.open(OFFLINE_DATA_CACHE).then(cache => cache.match('/offline-ready')).then(async ready => {
            if (!ready) return;
            hasOfflineCopy = true;
            hasCurrentOfflineCopy = hasCurrentOfflineCopy || await ready.text() === OFFLINE_VERSION;
            if (!download) {
                offlineButton.disabled = hasCurrentOfflineCopy;
                offlineButton.textContent = hasCurrentOfflineCopy ? 'Available offline' : 'Update offline copy';
                offlineStatus.dataset.state = hasCurrentOfflineCopy ? 'ready' : '';
                offlineStatus.textContent = hasCurrentOfflineCopy
                    ? 'Saved on this device and up to date for offline reading.'
                    : 'Your saved offline copy is from an earlier website version. Update it to include the latest changes.';
            }
        }).catch(() => {});
        offlineButton.addEventListener('click', async () => {
            const controller = download = new AbortController();
            const { signal } = controller;
            const requestOptions = { signal, cache: 'reload', headers: { 'X-Hadith-Download': '1' } };
            offlineButton.disabled = true;
            offlineButton.textContent = 'Saving…';
            offlineCancel.hidden = false;
            offlineStatus.dataset.state = 'saving';
            offlineStatus.textContent = 'Preparing the offline copy…';
            try {
                if (!await offlineRegistration) throw new Error('Offline support is unavailable');
                await navigator.serviceWorker.ready;
                const response = await fetch('/data/v2/manifest.json', requestOptions);
                if (!response.ok) throw new Error('Could not load the dataset manifest');
                const manifest = await response.json();
                const dataFiles = [...Object.keys(manifest.files), 'manifest.json', 'grades.json']
                    .map(file => '/data/v2/' + file);
                const files = [...OFFLINE_SHELL, ...dataFiles];
                let done = 0;
                for (let i = 0; i < files.length; i += 4) {
                    await Promise.all(files.slice(i, i + 4).map(async file => {
                        const cache = await caches.open(file.startsWith('/data/') ? OFFLINE_DATA_CACHE : OFFLINE_SHELL_CACHE);
                        const response = await fetch(file, requestOptions);
                        if (!response.ok) throw new Error('Could not save ' + file);
                        await cache.put(file, response);
                        signal.throwIfAborted();
                        offlineStatus.textContent = `Saving for offline reading: ${Math.round(++done / files.length * 100)}%`;
                    }));
                }
                const cache = await caches.open(OFFLINE_DATA_CACHE);
                signal.throwIfAborted();
                await cache.put('/offline-ready', new Response(OFFLINE_VERSION));
                hasOfflineCopy = true;
                hasCurrentOfflineCopy = true;
                offlineStatus.dataset.state = 'ready';
                offlineStatus.textContent = 'Ready. All nine collections, your bookmarks and the website work offline on this device.';
            } catch {
                const cancelled = signal.aborted;
                controller.abort();
                offlineStatus.dataset.state = '';
                offlineStatus.textContent = cancelled
                    ? 'Download cancelled. You can start again whenever you’re ready.'
                    : 'Could not finish saving. Check your connection or available storage, then try again in Safari or Chrome.';
            } finally {
                download = null;
                offlineButton.disabled = hasCurrentOfflineCopy;
                offlineButton.textContent = hasCurrentOfflineCopy ? 'Available offline' : hasOfflineCopy ? 'Update offline copy' : 'Make available offline';
                offlineCancel.hidden = true;
                if (document.activeElement === offlineCancel) offlineButton.focus();
            }
        });
    }
}
