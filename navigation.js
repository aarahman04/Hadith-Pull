/* Keep each screen mounted so navigation preserves the reader and its controls. */
const SiteNavigation = (() => {
    const files = { read: 'index.html', bookmarks: 'bookmarks.html', about: 'about.html',
        privacy: 'privacy.html', 'whats-new': 'whats-new.html', licenses: 'licenses.html', contact: 'contact.html' };
    const tabs = ['read', 'bookmarks', 'about'];
    const pages = new Map();
    const pending = new Map();
    let active = pageKey(new URL(location.href));
    let navigation = 0;
    let transition = null;

    function pageKey(url) {
        if (url.origin !== location.origin) return null;
        const path = url.pathname.replace(/\/$/, '').replace(/^\//, '').replace(/\.html$/, '');
        return path === '' || path === 'index' ? 'read' : Object.hasOwn(files, path) ? path : null;
    }

    function mount(key, source, url) {
        const main = source.querySelector('main');
        if (!main) throw new Error('Missing screen: ' + key);
        main.dataset.page = key;
        main.hidden = key !== active;
        if (source !== document) document.querySelector('.site-footer').before(main);
        pages.set(key, { main, title: source.title, url, top: 0, scroll: 0,
            description: source.querySelector('meta[name="description"]')?.content,
            canonical: source.querySelector('link[rel="canonical"]')?.href });
        if (key === 'read') {
            source.querySelectorAll('.modal').forEach(sheet => {
                if (!document.getElementById(sheet.id)) document.body.appendChild(sheet);
            });
            if (!document.getElementById('prefs-btn')) {
                const prefs = source.getElementById('prefs-btn');
                prefs.hidden = active !== 'read';
                document.querySelector('.header-actions').prepend(prefs);
            }
        }
        if (key === 'contact') initContact(main);
        return pages.get(key);
    }

    function loadPage(key) {
        if (pages.has(key)) return Promise.resolve(pages.get(key));
        if (!pending.has(key)) {
            pending.set(key, fetch(files[key], { cache: 'no-cache' }).then(response => {
                if (!response.ok) throw new Error('Could not load ' + key);
                return response.text();
            }).then(html => mount(key, new DOMParser().parseFromString(html, 'text/html'),
                new URL(key === 'read' ? './' : key, location.href)))
                .finally(() => pending.delete(key)));
        }
        return pending.get(key);
    }

    function updateTabs() {
        const primary = tabs.includes(active) ? active : 'about';
        document.querySelectorAll('.site-nav a, .tabbar a').forEach(link => {
            if (pageKey(new URL(link.href)) === primary) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });
        const prefs = document.getElementById('prefs-btn');
        if (prefs) prefs.hidden = active !== 'read';
        updateTabIndicator();
    }

    function updateTabIndicator() {
        const nav = document.querySelector('.site-nav');
        const link = nav?.querySelector('[aria-current="page"]');
        if (!link?.offsetWidth) return;
        nav.style.setProperty('--tab-x', link.offsetLeft + 'px');
        nav.style.setProperty('--tab-width', link.offsetWidth + 'px');
        nav.classList.add('has-indicator');
    }

    async function show(url, { historyChange = false, direction } = {}) {
        const key = pageKey(url);
        if (!key) return;
        const request = ++navigation;
        try {
            const page = await loadPage(key);
            if (request !== navigation) return;
            const changed = key !== active;
            if (direction === undefined) direction = tabs.includes(active) && tabs.includes(key) && tabs.indexOf(key) < tabs.indexOf(active) ? -1 : 1;
            const motion = changed && !matchMedia('(prefers-reduced-motion: reduce)').matches;
            const slide = motion && matchMedia('(max-width: 720px), (hover: none) and (pointer: coarse)').matches;
            const update = () => {
                if (request !== navigation) return;
                const previous = pages.get(active);
                if (changed) {
                    previous.top = window.scrollY;
                    previous.scroll = previous.main.scrollTop;
                    if (!historyChange) previous.url = new URL(location.href);
                    previous.main.hidden = true;
                }
                closeMenu();
                document.querySelectorAll('.modal.is-open').forEach(closeSheet);
                active = key;
                const shared = key === 'read' && url.searchParams.has('h') && url.searchParams.get('h') !== page.url.searchParams.get('h');
                if (!historyChange && !url.search && !url.hash) url = page.url;
                page.url = new URL(url);
                if (!historyChange && location.href !== url.href) history.pushState(null, '', url);
                document.body.classList.toggle('page-read', key === 'read');
                document.title = page.title;
                document.querySelector('meta[name="description"]').content = page.description || '';
                const canonical = document.querySelector('link[rel="canonical"]');
                if (page.canonical) {
                    const link = canonical || document.createElement('link');
                    link.rel = 'canonical';
                    link.href = page.canonical;
                    if (!canonical) document.head.appendChild(link);
                } else if (canonical) canonical.remove();
                page.main.hidden = false;
                updateTabs();
                document.dispatchEvent(new CustomEvent('screenchange', { detail: key }));
                if (changed) {
                    page.main.scrollTop = page.scroll;
                    window.scrollTo(0, page.top);
                    const heading = page.main.querySelector('#bookmarks-root h1') || page.main.querySelector('h1');
                    if (heading) {
                        heading.tabIndex = -1;
                        heading.focus({ preventScroll: true });
                    }
                }
                if (motion && !(slide && document.startViewTransition)) {
                    page.main.getAnimations().forEach(animation => animation.cancel());
                    page.main.animate(slide
                        ? [{ transform: `translateX(${-direction * 100}vw)` }, { transform: 'none' }]
                        : [{ opacity: 0 }, { opacity: 1 }],
                    { duration: 650, easing: slide ? 'cubic-bezier(0.45, 0, 0.2, 1)' : 'ease-in-out' });
                }
                if (url.hash && key !== 'bookmarks') {
                    document.getElementById(decodeURIComponent(url.hash.slice(1)))?.scrollIntoView();
                }
                if (shared) openShared(url.searchParams.get('h'));
            };
            if (transition) transition.skipTransition();
            if (slide && document.startViewTransition) {
                document.documentElement.dataset.slideDirection = direction < 0 ? 'back' : 'forward';
                const next = transition = document.startViewTransition(update);
                next.ready.catch(() => {});
                next.finished.catch(() => {}).then(() => { if (transition === next) transition = null; });
                await next.updateCallbackDone;
            } else update();
        } catch (error) {
            console.error(error);
            if (request === navigation) toast('Could not open this page. Check your connection and try again.');
        }
    }

    function cycle(direction, slideDirection = direction) {
        const index = tabs.indexOf(active);
        if (index === -1) return;
        const next = tabs[(index + direction + tabs.length) % tabs.length];
        show(new URL(next === 'read' ? './' : next, location.href), { direction: slideDirection });
    }

    function setReadKey(key) {
        const page = pages.get('read');
        if (key) page.url.searchParams.set('h', key);
        else page.url.searchParams.delete('h');
        if (active === 'read') history.replaceState(null, '', page.url);
    }

    function initContact(main) {
        main.querySelector('#contact-form').addEventListener('submit', event => {
            event.preventDefault();
            const subject = encodeURIComponent('Message from ' + main.querySelector('#name').value);
            const body = encodeURIComponent(main.querySelector('#message').value);
            window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=aarahman803@gmail.com&su=${subject}&body=${body}`, '_blank');
        });
    }

    function initSwipes() {
        let start = null;
        document.addEventListener('touchstart', event => {
            start = null;
            const touch = event.touches[0];
            if (event.touches.length !== 1 || !tabs.includes(active) ||
                !event.target.closest('main') || event.target.closest('a, button, input, textarea, select') ||
                document.querySelector('.modal.is-open, .menu') || window.getSelection()?.toString() ||
                touch.clientX < 24 || touch.clientX > innerWidth - 24) return;
            start = { x: touch.clientX, y: touch.clientY, time: performance.now() };
        }, { passive: true });
        document.addEventListener('touchmove', event => {
            if (!start) return;
            if (event.touches.length !== 1) { start = null; return; }
            const dx = Math.abs(event.touches[0].clientX - start.x);
            const dy = Math.abs(event.touches[0].clientY - start.y);
            if (dy > 16 && dy > dx) start = null;
            else if (dx > 16 && dx > dy * 1.5 && event.cancelable) event.preventDefault();
        }, { passive: false });
        document.addEventListener('touchend', event => {
            if (!start) return;
            const dx = event.changedTouches[0].clientX - start.x;
            const dy = event.changedTouches[0].clientY - start.y;
            if (Math.abs(dx) > 64 && Math.abs(dx) > Math.abs(dy) * 1.5 &&
                performance.now() - start.time < 700 && !window.getSelection()?.toString()) cycle(dx < 0 ? 1 : -1, dx < 0 ? -1 : 1);
            start = null;
        }, { passive: true });
        document.addEventListener('touchcancel', () => { start = null; }, { passive: true });
    }

    async function start() {
        mount(active, document, new URL(location.href));
        await Promise.allSettled(tabs.map(loadPage));
        const scriptVersion = '?v=20261023-navigation-4';
        for (const file of ['card.js', 'script.js', 'bookmarks.js']) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = file + scriptVersion;
                script.onload = resolve;
                script.onerror = () => reject(new Error('Could not load ' + file));
                document.body.appendChild(script);
            });
        }
        initReader();
        updateTabs();
        // shortcut: optional helpers retry on reload; add an in-page retry if failures recur.
        for (const file of ['offline.js', 'reminders.js']) {
            const script = document.createElement('script');
            script.src = file + scriptVersion;
            script.onerror = () => console.error('Could not load ' + file);
            document.body.appendChild(script);
        }
        window.addEventListener('resize', updateTabIndicator);
        if (document.fonts) document.fonts.ready.then(updateTabIndicator);
        if (!tabs.every(key => pages.has(key))) return;
        history.scrollRestoration = 'manual';
        document.addEventListener('click', event => {
            const link = event.target.closest('a[href]');
            if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey ||
                event.shiftKey || event.altKey || link.hasAttribute('download') || link.target) return;
            const url = new URL(link.href);
            if (!pageKey(url) || link.getAttribute('href').startsWith('#')) return;
            event.preventDefault();
            show(url);
        });
        window.addEventListener('popstate', () => show(new URL(location.href), { historyChange: true }));
        initSwipes();
    }

    start().catch(console.error);
    return { cycle, setReadKey, isReading: () => active === 'read' };
})();
