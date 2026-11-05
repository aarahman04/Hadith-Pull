const SearchPage = (() => {
    const { Local } = Parity, { el, button } = Topics;
    let worker, serial = 0, timer, mode = 'search', requestedMode = 'search', pending = new Map();
    const stories = ['The woman punished over a cat', 'The man who gave water to a thirsty dog', 'Three men trapped in a cave', 'The man who killed ninety-nine people', 'The Bedouin who urinated in the mosque', 'Jibril asks about Islam, Iman and Ihsan', 'The man who asked to be burned after death', 'The companion who stayed behind from Tabuk'];
    function queryWorker(data) {
        if (!worker) {
            worker = new Worker('search-worker.js');
            worker.onmessage = ({ data }) => { if (data.metrics) { const root = document.getElementById('search-root'); root.dataset.coldMs = data.metrics.coldMs.toFixed(1); root.dataset.databaseBytes = data.metrics.databaseBytes; return; } const task = pending.get(data.id); if (!task) return; pending.delete(data.id); data.error ? task.reject(Error(data.error)) : task.resolve(data); };
            worker.onerror = () => { for (const p of pending.values()) p.reject(Error('Search could not start. Reload or retry.')); pending.clear(); worker.terminate(); worker = null; };
        }
        return new Promise((resolve, reject) => { pending.set(data.id, { resolve, reject }); worker.postMessage(data); });
    }
    function initFilterDisclosure(panel, trigger) {
        const reveal = panel.querySelector('.filter-reveal');
        let filterAnimation, filtersOpen = false;
        function setOpen(open, immediate = false) {
            filtersOpen = open;
            const from = panel.hidden ? 0 : reveal.getBoundingClientRect().height;
            filterAnimation?.cancel(); filterAnimation = null;
            trigger.setAttribute('aria-expanded', String(open)); panel.hidden = false;
            if (immediate || matchMedia('(prefers-reduced-motion: reduce)').matches) { panel.hidden = !open; return; }
            const animation = filterAnimation = reveal.animate([
                { height: from + 'px', opacity: open ? .45 : 1 },
                { height: (open ? reveal.scrollHeight : 0) + 'px', opacity: open ? 1 : 0 }
            ], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
            animation.finished.then(() => { if (filterAnimation === animation) { panel.hidden = !filtersOpen; filterAnimation = null; } }).catch(() => {});
        }
        trigger.addEventListener('click', () => setOpen(!filtersOpen));
        return setOpen;
    }
    async function removeRecents(nodes, commit) {
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches) await Promise.all(nodes.map(node => {
            node.inert = true; node.getAnimations().forEach(animation => animation.cancel());
            return node.animate([
                { height: node.getBoundingClientRect().height + 'px', opacity: 1, overflow: 'hidden' },
                { height: '0px', opacity: 0, paddingTop: '0px', paddingBottom: '0px', marginTop: '0px', marginBottom: '0px', overflow: 'hidden' }
            ], { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' }).finished.catch(() => {});
        }));
        commit();
    }
    function init() {
        const root = document.getElementById('search-root'); if (!root) return;
        const form = root.querySelector('form'), input = root.querySelector('#search-query'), results = root.querySelector('#search-results'), recent = root.querySelector('#search-recents'), extras = root.querySelector('#search-extras'), filters = root.querySelector('#describe-filters');
        const filterTrigger = root.querySelector('#describe-filter-toggle');
        const setFiltersOpen = initFilterDisclosure(filters, filterTrigger);
        const drafts = { search: '', describe: '' };
        function keep() { const key = 'recent-' + mode; Local.set(key, Parity.queryAfterUse(Local.get(key, []), input.value)); paintRecents(); }
        function paintRecents() {
            recent.replaceChildren(); const key = 'recent-' + mode, list = Local.get(key, []); if (!list.length || input.value.trim()) return;
            const heading = el('div', 'recent-heading');
            heading.append(el('h2', 'shelf-title', mode === 'search' ? 'Recent searches' : 'Recent descriptions'), button('Clear', () => removeRecents([...recent.children], () => { Local.set(key, []); paintRecents(); }), 'text-action'));
            recent.append(heading);
            list.forEach(q => { const row = el('div', 'recent-query'), remove = button('', () => removeRecents([row], () => { Local.set(key, Local.get(key, []).filter(s => s !== q)); paintRecents(); }), 'quiet-icon'); remove.append(Topics.mark('close')); remove.setAttribute('aria-label', 'Remove ' + q); row.append(Topics.mark('history'), button(q, () => { input.value = q; syncClear(); keep(); run(true); }, 'recent-choice'), remove); recent.append(row); });
        }
        async function empty() {
            const turn = serial; extras.replaceChildren(); results.setAttribute('aria-busy', 'false'); Topics.transition(results, () => results.replaceChildren());
            if (mode === 'describe') { extras.append(el('h2', 'shelf-title', 'Stories people look for')); const list = el('div', 'story-grid'); stories.forEach(s => { const b = button(s, () => { input.value = s; syncClear(); keep(); run(true); }, 'topic-row'); b.prepend(Topics.mark('book')); list.append(b); }); extras.append(list); Topics.reveal(list); }
            else { try { const model = await Topics.load(); if (turn !== serial || mode !== 'search' || input.value.trim()) return; const browse = el('div', 'search-browse'); browse.append(Topics.grid(model.cards.slice(0, 9), c => Topics.openCategory(c.tiles.length === 1 ? c.tiles[0].id : c.id))); extras.append(el('h2', 'shelf-title', 'Browse'), browse); Topics.reveal(browse); } catch { extras.append(el('p', '', 'Browse is unavailable. Try reloading.')); } }
        }
        function request() { return { words: input.value.trim(), name: root.querySelector('#search-name').value, collections: [...filters.querySelectorAll('[name="collection"]:checked')].map(x => x.value), grades: [...filters.querySelectorAll('[name="grade"]:checked')].map(x => x.value) }; }
        async function run(jump = false) {
            clearTimeout(timer); const id = ++serial;
            const asked = request();
            if (!input.value.trim() && (mode === 'search' || (!asked.name && !asked.collections.length && !asked.grades.length))) { empty(); return; }
            extras.replaceChildren(); results.setAttribute('aria-busy', 'true');
            await Topics.transition(results, () => { if (id === serial) results.replaceChildren(Topics.skeleton()); });
            if (id !== serial) return;
            try {
                const [answer, model] = await Promise.all([queryWorker({ id, mode, query: input.value.trim(), request: asked }), Topics.load()]);
                if (id !== serial) return;
                const { result, suggestions } = answer; root.dataset.warmMs = answer.elapsedMs.toFixed(1);
                results.replaceChildren(); results.setAttribute('aria-busy', 'false'); Topics.reveal(results);
                if (suggestions.length) { const list = el('div', 'topic-grid'); results.append(el('h2', 'shelf-title', 'Topics and situations'), list); suggestions.forEach(s => { const choice = model.choice(s.id); if (choice) list.append(Topics.row(choice, () => { keep(); Topics.openCategory(s.id); })); }); }
                const heading = el('h2', 'shelf-title', 'Narrations'); results.append(heading);
                const corrections = Object.entries(result.corrections); if (corrections.length) results.append(el('p', 'local-note', 'Searched: ' + corrections.map(([a, b]) => `${a} → ${b}`).join(', ')));
                const urns = Parity.unique([...result.pinned, ...result.hits.map(h => h.urn)]);
                if (!urns.length) results.append(el('p', '', 'Nothing found. Try fewer or different words, or remove a filter.'));
                else {
                    // Resolve before attaching the list: a newer query cannot receive stale narration cards.
                    const list = el('div'); results.append(list);
                    await Topics.narrationList(list, urns, null, keep, result.hits, () => id !== serial, () => {}, /[\u0600-\u06ff]/u.test(asked.words) ? 'ar' : 'en');
                    if (id !== serial) return;
                    if (jump) heading.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
                }
            } catch (error) { if (id === serial) { results.setAttribute('aria-busy', 'false'); results.replaceChildren(el('p', '', error.message), button('Retry search', () => run(jump))); } }
        }
        const clear = root.querySelector('.query-clear');
        const syncClear = () => { clear.hidden = !input.value; };
        clear.addEventListener('click', () => { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); input.focus(); });
        input.addEventListener('input', () => { ++serial; clearTimeout(timer); syncClear(); paintRecents(); timer = setTimeout(() => run(), mode === 'search' ? 250 : 450); });
        form.addEventListener('submit', e => { e.preventDefault(); keep(); run(true); });
        filters.addEventListener('input', () => { const asked = request(), count = asked.collections.length + asked.grades.length + Number(Boolean(asked.name.trim())), badge = root.querySelector('#filter-count'); badge.textContent = count; badge.hidden = !count; ++serial; clearTimeout(timer); timer = setTimeout(() => run(), 250); });
        root.querySelector('.search-modes').addEventListener('click', () => {
            const pill = root.querySelector('.search-modes');
            if (pill.dataset.switching === 'true') return;
            requestedMode = requestedMode === 'search' ? 'describe' : 'search'; ++serial; clearTimeout(timer);
            pill.classList.remove('to-search', 'to-describe'); void pill.offsetWidth;
            pill.classList.toggle('is-describe', requestedMode === 'describe');
            if (!matchMedia('(prefers-reduced-motion: reduce)').matches) pill.classList.add('to-' + requestedMode);
            lockPill(pill, [...pill.querySelectorAll('button')]);
            root.querySelectorAll('[data-mode]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.mode === requestedMode)));
            Topics.modeTransition(root.querySelector('#search-mode-content'), () => {
                drafts[mode] = input.value; mode = requestedMode; input.value = drafts[mode]; syncClear();
                filterTrigger.hidden = mode !== 'describe'; if (mode === 'search') setFiltersOpen(false, true); input.placeholder = mode === 'search' ? 'Words, Arabic, a reference or a link' : 'Describe what you remember…';
                paintRecents(); run();
            });
        });
        form.querySelector('[type="submit"]').disabled = false;
        paintRecents(); run();
    }
    init(); return { queryWorker, initFilterDisclosure, removeRecents };
})();
