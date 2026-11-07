/* Categories, Read-from, history and narration detail share canonical reader actions. */
const Topics = (() => {
    let promise, model, detailSerial = 0, categorySerial = 0;
    const categoryViews = new Map();
    const { Local } = Parity;
    const savedBookmarks = id => typeof BookmarkStore !== 'undefined' ? BookmarkStore.readingSource(id) : null;
    const el = (tag, cls, text) => { const node = document.createElement(tag); if (cls) node.className = cls; if (text != null) node.textContent = text; return node; };
    function button(text, action, cls = 'btn btn-ghost') { const b = el('button', cls, text); b.type = 'button'; b.addEventListener('click', action); return b; }
    function mark(name) {
        const paths = { search: 'M21 21l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0', close: 'M6 6l12 12M18 6 6 18', back: 'm14 6-6 6 6 6', next: 'm10 6 6 6-6 6', history: 'M4 12A8 8 0 1 0 6.34 6.34L4 8.7M4 4.5V8.7H8.2M12 8V12.4L15 14.2', book: 'M3.5 5.8c2.9-1.1 5.7-.8 8.5 1.2 2.8-2 5.6-2.3 8.5-1.2v12.6c-2.9-1.1-5.7-.8-8.5 1.2-2.8-2-5.6-2.3-8.5-1.2zM12 7v12.6' };
        const span = el('span', 'ui-mark'); span.setAttribute('aria-hidden', 'true');
        span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name] || paths.search}"/></svg>`; return span;
    }
    function skeleton(count = 6) {
        const list = el('div', 'narration-list skeleton-list'); list.setAttribute('aria-hidden', 'true');
        for (let i = 0; i < count; i++) { const card = el('div', 'narration-result skeleton-card'); for (let n = 0; n < 5; n++) card.append(el('span')); list.append(card); }
        return list;
    }
    function reveal(node, delay = 0) {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        node.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 480, delay, fill: 'backwards', easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    const swaps = new WeakMap();
    async function transition(node, paint) {
        const token = {}; swaps.set(node, token); node.getAnimations().forEach(a => a.cancel());
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches && node.childNodes.length) {
            await node.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-in' }).finished.catch(() => {});
        }
        if (swaps.get(node) !== token || !node.isConnected) return;
        paint(); reveal(node);
    }
    const modeSwaps = new WeakMap();
    async function modeTransition(node, paint) {
        modeSwaps.get(node)?.();
        node.getAnimations().forEach(a => a.cancel());
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) { paint(); return; }
        const ghost = node.cloneNode(true), height = node.getBoundingClientRect().height;
        ghost.removeAttribute('id'); ghost.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
        ghost.classList.add('search-mode-ghost'); ghost.setAttribute('aria-hidden', 'true'); ghost.inert = true;
        Object.assign(ghost.style, { top: node.offsetTop + 'px', left: node.offsetLeft + 'px', width: node.offsetWidth + 'px' });
        const previousHeight = node.style.minHeight; node.style.minHeight = height + 'px'; node.after(ghost);
        paint();
        const options = { duration: 650, easing: 'ease-in-out' };
        const outgoing = ghost.animate([{ opacity: 1 }, { opacity: 0 }], options);
        const incoming = node.animate([{ opacity: 0 }, { opacity: 1 }], options);
        const cleanup = () => { outgoing.cancel(); incoming.cancel(); ghost.remove(); node.style.minHeight = previousHeight; modeSwaps.delete(node); };
        modeSwaps.set(node, cleanup);
        Promise.all([outgoing.finished, incoming.finished]).catch(() => {}).then(() => { if (modeSwaps.get(node) === cleanup) cleanup(); });
    }
    function searchField(input) {
        const line = el('div', 'query-line topic-query'), clear = button('', () => { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); input.focus(); }, 'quiet-icon query-clear');
        clear.append(mark('close')); clear.setAttribute('aria-label', 'Clear topic search');
        const sync = () => { clear.hidden = !input.value; }; input.addEventListener('input', sync); sync();
        line.append(mark('search'), input, clear); return line;
    }
    function reference(h, language = 'en') {
        const head = el('div', 'result-reference');
        const label = el('small', '', language === 'ar' ? arabicReference(h) : `${h.collectionTitle} · ${h.ref}`);
        label.lang = language; label.dir = language === 'ar' ? 'rtl' : 'ltr';
        head.append(label, el('span', 'status ' + gradeClass(h.primary), language === 'ar' ? arabicGrade(h.primary) : gradeLabel(h.primary))); return head;
    }
    function pageDirection(event) {
        if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return 0;
        return event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    }
    async function load() {
        if (!promise) promise = Promise.all(['arrangement', 'taxonomy', 'labels', 'art', 'short-titles', 'finder'].map(name => fetch('data/topics/' + name + '.json').then(r => { if (!r.ok) throw Error('Topics unavailable'); return r.json(); })))
            .then(args => model = new Parity.Categories(...args)).catch(error => { promise = null; throw error; });
        return promise;
    }
    function icon(key) {
        const span = el('span', 'category-art'); span.setAttribute('aria-hidden', 'true');
        // Only locally generated, audited SVG paths are inserted as markup.
        span.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor">${model.art.svg[key] || model.art.svg.AutoStories}</svg>`;
        return span;
    }
    function row(choice, action, subtitle, selected = false) {
        const b = button('', action, 'topic-row' + (selected ? ' is-selected' : ''));
        b.append(icon(choice.icon)); const text = el('span', 'topic-row-text');
        text.append(el('strong', '', choice.title), el('small', '', subtitle || choice.where || `${model.urns(choice.id).length} narrations`));
        b.append(text, el('span', 'topic-chevron', '›')); b.setAttribute('aria-label', choice.title + (selected ? ', selected' : ''));
        if (selected) b.setAttribute('aria-pressed', 'true'); return b;
    }
    function grid(cards, onPick) {
        const list = el('div', 'category-grid' + (cards.some(c => c.wide) ? ' has-featured' : ''));
        const spans = columns => Parity.balancedRows(cards.length, columns).flatMap(n => Array(n).fill(12 / n));
        const wide = spans(4), medium = spans(3);
        for (const [index, card] of cards.entries()) {
            const b = button('', () => onPick(card), 'category-card' + (card.wide ? ' is-wide' : ''));
            b.style.setProperty('--span-wide', wide[index]); b.style.setProperty('--span-medium', medium[index]);
            b.setAttribute('aria-label', card.title + ', ' + card.caption); b.dataset.card = card.id;
            b.append(icon(card.icon)); const text = el('span', 'category-caption');
            text.append(el('small', '', card.caption)); const title = el('strong', 'category-grid-title');
            (card.wide ? [card.title] : card.gridTitle.split('\n')).forEach(line => title.append(el('span', '', line)));
            text.append(title); b.append(text); list.append(b);
            const arrow = el('span', 'category-card-arrow', '→'); arrow.setAttribute('aria-hidden', 'true');
            b.append(arrow);
            if (card.wide && card.blurb) b.append(el('span', 'category-card-blurb', card.blurb));
        }
        return list;
    }
    function sheet(title, anchor) {
        const modal = el('div', 'modal parity-modal'); modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-hidden', 'true');
        const panel = el('div', 'modal-panel'), heading = el('h2', '', title); heading.id = 'parity-heading-' + (++detailSerial); modal.setAttribute('aria-labelledby', heading.id);
        const head = el('div', 'modal-head'), close = button('', () => closeSheet(modal), 'quiet-icon sheet-close'); close.append(mark('close')); close.setAttribute('aria-label', 'Close'); head.append(heading, close); panel.append(el('div', 'sheet-handle'), head);
        const body = el('div', 'parity-sheet-body'); panel.append(body); modal.append(panel); document.body.append(modal);
        modal.addEventListener('click', e => { if (e.target === modal) closeSheet(modal); }); enableSwipeToClose(modal); modal.getBoundingClientRect(); openSheet(modal, anchor || document.activeElement);
        modal.addEventListener('transitionend', e => { if (e.target === modal && !modal.classList.contains('is-open')) modal.remove(); });
        return { modal, body };
    }
    async function detail(urns, index = 0, topic = null, anchor, initialLanguage = null, readingSource = topic, onMore = null) {
        const { modal, body } = sheet('Narration', anchor); let turn = 0, active = index, language = initialLanguage || readingLanguage(), current;
        modal.classList.add('narration-modal');
        body.tabIndex = 0; body.setAttribute('role', 'region'); body.setAttribute('aria-label', 'Narration text');
        const head = modal.querySelector('.modal-head'); head.querySelector('h2').classList.add('sr-only');
        if (onMore) { const more = button('⋯', () => current && onMore(more, active), 'quiet-icon bookmark-sheet-more'); more.setAttribute('aria-label', 'More actions'); head.insertBefore(more, head.querySelector('.sheet-close')); }
        const previous = button('', () => show(active - 1), 'quiet-icon'), next = button('', () => show(active + 1), 'quiet-icon'), position = el('span', 'detail-position');
        previous.append(mark('back')); next.append(mark('next'));
        previous.setAttribute('aria-label', 'Previous narration'); next.setAttribute('aria-label', 'Next narration');
        previous.title = 'Previous narration (←)'; next.title = 'Next narration (→)';
        const toggle = button('', () => { if (toggle.dataset.switching === 'true') return; language = language === 'en' ? 'ar' : 'en'; paintLanguage(true); lockPill(toggle); }, 'language-toggle detail-language');
        toggle.innerHTML = '<span class="language-track" aria-hidden="true"><span class="language-en"><span>En</span></span><span class="language-ar" lang="ar"><span>ع</span></span></span>';
        head.prepend(previous, position, next, toggle);
        const progress = el('div', 'detail-progress'), fill = el('span'); progress.append(fill); head.after(progress);
        const stage = el('div', 'detail-stage'), card = el('div', 'detail-card'), identity = el('div', 'detail-identity'); body.before(stage); stage.append(card); card.append(identity, body);
        const attribution = el('div', 'detail-attribution'), narrator = el('p', 'detail-narrator'); attribution.append(narrator); card.append(attribution);
        const reportSlot = el('div', 'detail-report-slot'); reportSlot.hidden = !topic; stage.after(reportSlot);
        const footer = el('div', 'narration-actions'); reportSlot.after(footer);
        function paintLanguage(animate = false) {
            body.getAnimations().forEach(a => a.cancel());
            const arabic = usesArabic(current, language), available = hasArabicWorthShowing(current.arabic);
            const shownLanguage = arabic ? 'ar' : 'en', h = current;
            identity.dir = arabic ? 'rtl' : 'ltr';
            identity.replaceChildren(reference(h, shownLanguage));
            const summary = el('div', 'detail-summary'), chapter = referenceChapter(h, shownLanguage);
            if (chapter) { const title = el('p', 'detail-chapter', chapter); title.lang = shownLanguage; title.dir = arabic ? 'rtl' : 'ltr'; summary.append(title); }
            const source = el('a', 'text-action', readingLabel('sunnah', shownLanguage) + ' ↗'); source.href = h.sunnahUrl; source.target = '_blank'; source.rel = 'noopener'; source.lang = shownLanguage; source.dir = arabic ? 'rtl' : 'ltr'; summary.append(source); identity.append(summary);
            narrator.textContent = arabic ? h.narratorArabic || '' : h.narrator || ''; narrator.hidden = !narrator.textContent; narrator.lang = shownLanguage; narrator.dir = arabic ? 'rtl' : 'ltr';
            footer.querySelector('.detail-open-label').textContent = readingLabel('openRead', shownLanguage);
            body.querySelectorAll('.detail-english, .detail-arabic').forEach(n => n.hidden = n.classList.contains('detail-arabic') !== arabic);
            toggle.disabled = !available;
            toggle.setAttribute('aria-pressed', String(arabic)); toggle.setAttribute('aria-label', available ? arabic ? 'Switch to English' : 'Switch to Arabic' : 'Arabic unavailable');
            body.scrollTop = 0;
            if (animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
                for (const node of [body, identity, narrator]) {
                    node.getAnimations().forEach(a => a.cancel());
                    node.animate([{ opacity: .35 }, { opacity: 1 }], { duration: 650, easing: 'ease-in-out' });
                }
            }
        }
        async function show(i) {
            if (i < 0 || i >= urns.length) return;
            const direction = i - active, request = ++turn, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
            card.getAnimations().forEach(a => a.cancel()); stage.querySelectorAll('.detail-card-ghost').forEach(n => n.remove());
            const old = direction && current && !reduced ? card.cloneNode(true) : null;
            if (old) { old.classList.add('detail-card-ghost'); old.setAttribute('aria-hidden', 'true'); old.inert = true; stage.append(old); old.querySelector('.parity-sheet-body').scrollTop = body.scrollTop; card.style.visibility = 'hidden'; }
            active = i; current = null; footer.replaceChildren(); identity.replaceChildren(); reportSlot.replaceChildren();
            narrator.textContent = ''; narrator.hidden = true;
            previous.disabled = next.disabled = toggle.disabled = true; position.textContent = `${i + 1} of ${urns.length}`;
            const thumb = Math.max(100 / urns.length, 2); fill.style.width = `${thumb}%`; fill.style.left = `${urns.length > 1 ? (100 - thumb) * i / (urns.length - 1) : 0}%`;
            body.replaceChildren(skeleton(1)); body.setAttribute('aria-busy', 'true');
            try {
                const key = String(urns[i]), found = await findRecord(key.includes(':') ? key : 'urn:' + key); if (request !== turn || !modal.isConnected) return;
                if (!found) throw Error('This narration is unavailable.');
                const h = current = toHadith(found.record, found.collection);
                const english = el('div', 'detail-english', h.english), arabic = el('p', 'detail-arabic', h.arabic); arabic.lang = 'ar'; arabic.dir = 'rtl';
                const open = button('', async () => {
                    setReadingLanguage(language);
                    closeSheet(modal); await openInRead(h.key, readingSource);
                }, 'btn btn-primary detail-open'); open.append(mark('book'), el('span', 'detail-open-label')); footer.append(open);
                body.replaceChildren(english, arabic); body.setAttribute('aria-busy', 'false');
                if (topic) {
                    const available = typeof ReportQueue !== 'undefined' && ReportQueue;
                    const report = button(available ? ReportQueue.status(h.key.slice(4), topic) || 'Wrong topic?' : 'Reporting unavailable', () => reportTopic(h, topic, report), 'text-action');
                    report.disabled = !available; report.classList.add('detail-report'); reportSlot.append(report);
                }
                previous.disabled = i === 0; next.disabled = i === urns.length - 1; toggle.disabled = false; paintLanguage(); body.scrollTop = 0;
                card.style.visibility = '';
                if (old) {
                    const sign = Math.sign(direction), options = { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' };
                    old.animate([{ opacity: 1, transform: 'translateX(0) scale(1)' }, { opacity: .55, transform: `translateX(${-sign * 104}%) scale(.96)` }], options).finished.catch(() => {}).then(() => old.remove());
                    card.animate([{ opacity: .55, transform: `translateX(${sign * 104}%) scale(.96)` }, { opacity: 1, transform: 'translateX(0) scale(1)' }], options);
                } else if (!reduced) reveal(card, 140);
            } catch (error) { if (request === turn) { old?.remove(); card.style.visibility = ''; body.setAttribute('aria-busy', 'false'); body.replaceChildren(el('p', '', error.message), button('Retry', () => show(i))); } }
        }
        const pageKeys = e => {
            const direction = pageDirection(e);
            if (!current || !direction || [...document.querySelectorAll('.modal.is-open')].at(-1) !== modal) return;
            e.preventDefault(); e.stopPropagation(); show(active + direction);
        };
        document.addEventListener('keydown', pageKeys);
        modal.onClosed = () => { ++turn; document.removeEventListener('keydown', pageKeys); };
        let touch;
        body.addEventListener('touchstart', e => { const t = e.touches[0]; touch = { x: t.clientX, y: t.clientY }; }, { passive: true });
        body.addEventListener('touchend', e => { if (!touch || !current || !e.changedTouches.length) return; const t = e.changedTouches[0], dx = t.clientX - touch.x, dy = t.clientY - touch.y; touch = null; if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5 && !String(window.getSelection())) show(active + (dx < 0 ? 1 : -1)); }, { passive: true });
        show(index);
    }
    async function reportTopic(h, topic, anchor) {
        await load(); if (!model.entries.has(topic) || !(model.labels[topic] || []).includes(h.key.slice(4))) return;
        const { modal, body } = sheet('Wrong topic?', anchor); modal.classList.add('report-modal');
        body.append(el('p', '', `Does this narration belong in “${model.title(topic)}”?`), el('p', '', 'Report an incorrect topic assignment. The narration stays available while the report is reviewed.'));
        let reason = '';
        const reasons = [['', 'No reason'], ['not-about', 'Not about this'], ['passing', 'Only mentioned in passing'], ['other', 'Something else']];
        const label = el('label', '', 'Reason (optional)'), selected = el('span', '', 'No reason');
        const choose = button('', () => openMenu(choose, { title: 'Reason', matchWidth: true, items: reasons.map(([value, text]) => ({
            label: text, checked: reason === value, onSelect: () => { reason = value; selected.textContent = text; }
        })) }), 'occasion-select'); choose.setAttribute('aria-haspopup', 'menu'); choose.append(selected, mark('next'));
        label.append(choose); body.append(label, el('p', 'local-note', 'Reports contain an anonymous app identifier and the narration, topic and optional reason. They are saved on this device if you are offline.'));
        const actions = el('div', 'report-actions');
        const confirm = button('Confirm report', async () => {
            confirm.disabled = true;
            try {
                const state = await ReportQueue.enqueue(h.key.slice(4), topic, reason);
                if (state !== 'Reported · thank you') { toast(state); return; }
                anchor.textContent = state; closeSheet(modal); toast(state);
            }
            catch { toast('Could not save the report. Please try again.'); }
            finally { confirm.disabled = false; }
        }, 'btn btn-primary');
        actions.append(button('Cancel', () => closeSheet(modal)), confirm); body.append(actions);
    }
    async function narrationList(container, urns, topic, onUsed, hits = [], stale = () => false, onLoaded = () => {}, language = null) {
        let count = 0, busy = false; const list = el('div', 'narration-list'), more = button('Load more', append);
        const loading = skeleton(Math.min(6, urns.length)); container.append(list, loading, more); list.setAttribute('aria-busy', 'true');
        async function append() {
            if (busy) return; busy = true; more.disabled = true; more.textContent = 'Loading…';
            try {
                const end = Math.min(count + 15, urns.length), batch = await Promise.all(urns.slice(count, end).map(u => findRecord('urn:' + u)));
                if (!container.isConnected || stale()) return;
                batch.forEach((found, n) => {
                    const index = count + n; if (!found) return;
                    const h = toHadith(found.record, found.collection), b = button('', () => { onUsed?.(); detail(urns, index, topic, b, language); }, 'narration-result');
                    const arabic = language === 'ar' && hasArabicWorthShowing(h.arabic), text = arabic ? h.arabic : h.english;
                    const excerpt = el('p', arabic ? 'result-arabic' : '', buildExcerpt(text, { whole: 260, min: 100, cap: 200, worthHiding: 30 }) || text);
                    if (arabic) { excerpt.lang = 'ar'; excerpt.dir = 'rtl'; }
                    b.append(reference(h, arabic ? 'ar' : 'en'), excerpt);
                    list.append(b); reveal(b, Math.min(n, 5) * 45);
                }); const first = count === 0; count = end; more.hidden = count >= urns.length; more.textContent = 'Load more';
                if (first && batch.some(Boolean)) onLoaded();
            } catch { more.textContent = 'Could not load. Retry'; } finally { loading.remove(); list.setAttribute('aria-busy', 'false'); busy = false; more.disabled = false; }
        }
        await append();
    }
    function openCategory(id) { return SiteNavigation.show(new URL('categories?id=' + encodeURIComponent(id), location.href)); }
    async function renderCategories() {
        const root = document.getElementById('categories-root'); if (!root) return;
        const main = root.closest('main');
        const route = new URL(location.href).searchParams.get('id') || '';
        if (root.dataset.route === route && root.dataset.ready === 'true') {
            return;
        }
        if (root.dataset.ready === 'true') categoryViews.set(root.dataset.route, { nodes: [...root.childNodes], top: window.scrollY, scroll: main.scrollTop, turn: root.dataset.turn });
        while (categoryViews.size > 10) categoryViews.delete(categoryViews.keys().next().value);
        root.dataset.route = route; root.dataset.ready = 'false';
        const cached = categoryViews.get(route);
        const token = root.dataset.turn = cached?.turn || String(++categorySerial);
        if (cached) {
            root.replaceChildren(...cached.nodes); root.dataset.ready = 'true';
            reveal(root); requestAnimationFrame(() => {
                if (root.dataset.turn !== token) return;
                window.scrollTo(0, cached.top); main.scrollTop = cached.scroll;
            }); return;
        }
        root.replaceChildren(skeleton()); main.scrollTop = 0; window.scrollTo(0, 0);
        try {
            await load(); if (root.dataset.turn !== token) return;
            const choice = route && model.choice(model.saved(route));
            root.replaceChildren();
            if (choice) {
                    const back = button('All categories', () => SiteNavigation.show(new URL('categories', location.href), { restore: false }), 'text-action category-back'); back.prepend(mark('back')); root.append(back);
                const banner = el('div', 'category-detail-banner'), words = el('div');
                const title = el('h1', 'category-open-title', choice.title); title.tabIndex = -1;
                words.append(el('span', 'eyebrow', model.card(choice.id) ? 'Explore a subject' : 'Topic'), title, el('p', '', choice.blurb));
                banner.append(icon(choice.icon), words); root.append(banner);
                title.focus({ preventScroll: true }); window.scrollTo(0, 0);
                const card = model.card(choice.id);
                if (card && card.tiles.length > 1) {
                    for (const group of card.groups) { const section = el('section', 'category-topic-group'); if (group.title) section.append(el('h2', 'shelf-title', group.title)); const tiles = el('div', 'topic-grid'); group.tiles.forEach(t => tiles.append(row(t, () => openCategory(t.id)))); section.append(tiles); root.append(section); }
                } else {
                    const topic = card ? card.tiles[0].id : choice.id, urns = model.urns(topic);
                    root.append(el('p', 'local-note', `${urns.length} narrations`));
                    await narrationList(root, urns, topic, null, [], () => root.dataset.turn !== token, () => {
                        if (root.dataset.turn === token) { const read = button(Local.get('readFrom') === topic ? 'Reading from this topic' : 'Read from this topic', () => setSource(topic), 'btn btn-primary read-topic'); read.prepend(mark('book')); root.append(read); reveal(read, 200); }
                    });
                    if (root.dataset.turn !== token) return;
                }
                reveal(root); root.dataset.ready = 'true';
                return;
            }
            const input = el('input', 'topic-search'); input.type = 'search'; input.placeholder = 'Find a topic, like “debt”'; input.setAttribute('aria-label', 'Find a topic');
            const bar = el('div', 'catalog-search-bar');
            bar.append(searchField(input));
            const layout = el('div', 'catalog-layout'), results = el('div', 'catalog-content');
            layout.append(results); root.append(bar, layout);
            const paint = () => {
                results.replaceChildren();
                const searching = Boolean(input.value.trim()); layout.classList.toggle('is-searching', searching);
                if (searching) {
                    const found = model.find(input.value); results.append(el('p', 'catalog-result-count', found.length ? `${found.length} subjects and topics` : 'No topics found. Try another word.'));
                    const list = el('div', 'catalog-search-results'); found.forEach(c => list.append(row(c, () => openCategory(c.id)))); results.append(list);
                    return;
                }
                model.shelves.forEach((shelf, index) => {
                    const title = shelf.title || 'Foundations', id = 'category-shelf-' + index;
                    const section = el('section', 'catalog-shelf'); section.id = id;
                    const heading = el('div', 'catalog-shelf-heading');
                    const name = el('h2', '', title); name.id = id + '-heading'; section.setAttribute('aria-labelledby', name.id);
                    heading.append(name, el('span', '', `${shelf.cards.length} subjects`));
                    section.append(heading, grid(shelf.cards, c => openCategory(c.tiles.length === 1 ? c.tiles[0].id : c.id))); results.append(section);
                });
            };
            input.addEventListener('input', () => transition(results, paint)); paint(); reveal(results);
            if (location.hash.startsWith('#category-shelf-')) document.getElementById(location.hash.slice(1))?.scrollIntoView();
            root.dataset.ready = 'true';
        } catch { root.replaceChildren(el('p', '', 'Could not load topics. Check your connection or save an offline copy.'), button('Retry', renderCategories)); }
    }
    async function setSource(id) {
        await load(); const bookmarks = savedBookmarks(id), saved = bookmarks ? id : model.saved(id);
        if (bookmarks && !bookmarks.keys.length) { toast('Save a narration here to start reading.'); return; }
        Local.set('readFrom', saved); paintSource();
        // Finish drawing while Read is hidden, so arrival cannot show its old narration.
        while (isFetching) await new Promise(resolve => setTimeout(resolve, 30));
        await draw(); await SiteNavigation.show(new URL('./', location.href));
    }
    async function openInRead(key, topic) {
        if (topic) { await load(); Local.set('readFrom', savedBookmarks(topic) ? topic : model.saved(topic)); paintSource(); }
        await SiteNavigation.show(new URL('./?h=' + encodeURIComponent(key), location.href));
    }
    function paintSource() {
        const b = document.getElementById('read-from'); if (!b || !model) return;
        const bookmarks = savedBookmarks(Local.get('readFrom'));
        const id = model.saved(Local.get('readFrom')), label = bookmarks ? bookmarks.title : id ? model.eyebrow(id) : 'Hadith of the moment';
        const art = bookmarks ? bookmarkIcon() : icon(id ? model.choice(id)?.icon : 'AutoStories');
        b.replaceChildren(); b.append(art, el('span', 'reading-source-label', label), mark('next')); b.title = bookmarks ? bookmarks.title : '';
        b.setAttribute('aria-label', 'Read from: ' + (bookmarks ? bookmarks.title : model.title(id)));
        b.setAttribute('aria-haspopup', 'dialog');
    }
    function bookmarkIcon() {
        const art = el('span', 'category-art'); art.setAttribute('aria-hidden', 'true');
        art.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M6 4h12v17l-6-4-6 4z"/></svg>'; return art;
    }
    async function picker(anchor) {
        const { modal, body } = sheet('Read from', anchor); modal.classList.add('source-picker'); body.replaceChildren(skeleton(3));
        try {
            await load(); const selected = savedBookmarks(Local.get('readFrom')) ? Local.get('readFrom') : model.saved(Local.get('readFrom')); body.replaceChildren();
            const input = el('input', 'topic-search'); input.type = 'search'; input.placeholder = 'Find a topic or folder'; input.setAttribute('aria-label', 'Find a reading source');
            const search = el('div', 'source-search'), list = el('div', 'source-picker-list'); search.append(searchField(input));
            body.append(el('p', 'source-intro', 'Choose a subject for your next narration.'), search, list);
            const pick = id => { closeSheet(modal); setSource(id); };
            const all = { title: 'All hadith', id: null, icon: 'AutoStories' }; let activeCard = null;
            function section(title, choices, action) {
                const group = el('section', 'source-shelf'), options = el('div', 'source-options');
                if (title) group.append(el('h3', 'shelf-title', title));
                choices.forEach(c => { const option = row(c, () => action(c), c.caption, c.id === selected); if (c.bookmark) { option.firstChild.replaceWith(bookmarkIcon()); option.disabled = !savedBookmarks(c.id).keys.length; } options.append(option); }); group.append(options); return group;
            }
            function card(c) {
                if (c.tiles.length === 1) return pick(c.tiles[0].id);
                activeCard = c;
                transition(list, () => {
                    input.value = ''; search.querySelector('.query-clear').hidden = true;
                    const back = button('All categories', () => { activeCard = null; input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); }, 'text-action category-back'); back.prepend(mark('back'));
                    const summary = el('div', 'source-card-summary'); summary.append(icon(c.icon), el('h3', '', c.title));
                    list.replaceChildren(back, summary, row(c, () => pick(c.id), 'Read from all ' + c.tiles.length + ' topics', selected === c.id));
                    for (const g of c.groups) list.append(section(g.title || 'Choose a topic', [...g.tiles].sort((a, b) => Number(b.id === selected) - Number(a.id === selected)), t => pick(t.id)));
                    body.scrollTop = 0; back.focus({ preventScroll: true });
                });
            }
            function paint() {
                activeCard = null; list.replaceChildren();
                const bookmarks = [{ id: 'bookmarks', title: 'All bookmarks', caption: 'Every saved narration', bookmark: true }, ...BookmarkStore.getFolders().map(f => ({ id: 'bookmarks:' + f.id, title: f.name, caption: `${BookmarkStore.countIn(f.id)} saved narrations`, bookmark: true }))];
                if (input.value.trim()) { const found = model.find(input.value), folders = bookmarks.filter(c => c.title.toLowerCase().includes(input.value.toLowerCase())); if (!found.length && !folders.length) list.append(el('p', 'local-note', 'No matching topics or folders. Try another word.')); if (folders.length) list.append(section('Bookmarks', folders, c => pick(c.id))); if (found.length) list.append(section('Matching categories and topics', found, c => c.isCard ? card(model.card(c.id)) : pick(c.id))); return; }
                const selectedGroup = model.card(selected) || model.tiles.find(t => t.id === selected)?.card;
                const currentBookmarks = savedBookmarks(selected);
                const current = row(currentBookmarks ? { id: selected, title: currentBookmarks.title } : selected ? model.choice(selected) : all, () => selectedGroup ? card(selectedGroup) : pick(selected), selected ? 'Your current reading source' : 'Every collection and topic', true); if (currentBookmarks) current.firstChild.replaceWith(bookmarkIcon()); current.classList.add('source-current');
                list.append(el('h3', 'shelf-title', 'Reading from'), current);
                if (selected) list.append(row(all, () => pick(null), 'Return to every collection and topic'));
                list.append(section('Bookmarks', bookmarks, c => pick(c.id)));
                for (const shelf of model.shelves) list.append(section(shelf.title || 'Foundations', shelf.cards, card));
            }
            input.addEventListener('input', () => transition(list, paint)); paint();
            modal.addEventListener('keydown', e => { if (e.key === 'Escape' && activeCard) { e.preventDefault(); e.stopPropagation(); input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); input.focus(); } });
        } catch { body.replaceChildren(el('p', '', 'Could not load reading sources.'), button('Retry', () => { closeSheet(modal); picker(anchor); })); }
    }
    async function history(anchor) {
        const { modal, body } = sheet('Recently read', anchor); modal.classList.add('history-modal'); const keys = Local.get('recentRead', []).filter(k => k !== current?.key).slice(0, 10);
        if (!keys.length) { body.textContent = 'Your previous narrations will appear here.'; return; }
        const loading = skeleton(3), list = el('div', 'history-list'); body.append(loading, list);
        await Promise.all(keys.map(key => findRecord(key).catch(() => null))).then(records => records.forEach((found, i) => {
            if (!found) return; const h = toHadith(found.record, found.collection), b = button('', () => { document.querySelectorAll('.parity-modal.is-open').forEach(closeSheet); SiteNavigation.show(new URL('./?h=' + encodeURIComponent(keys[i]), location.href)); }, 'history-row');
            const text = el('span', 'history-row-text'); text.append(reference(h), el('span', 'history-excerpt', h.english)); b.append(mark('history'), text, mark('next')); list.append(b); reveal(b, i * 35);
        })); loading.remove();
        if (!list.childNodes.length) body.append(el('p', '', 'Previous narrations could not load. Please try again.'));
    }
    document.getElementById('read-from')?.addEventListener('click', e => picker(e.currentTarget));
    document.getElementById('recent-read')?.addEventListener('click', e => history(e.currentTarget));
    document.addEventListener('categoryreset', () => {
        categoryViews.clear(); const root = document.getElementById('categories-root');
        if (root) { root.dataset.ready = 'false'; root.dataset.turn = String(++categorySerial); }
        window.scrollTo(0, 0); if (root) root.closest('main').scrollTop = 0;
    });
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape' || e.defaultPrevented || document.querySelector('.modal.is-open') || !location.pathname.replace(/\.html$/, '').endsWith('/categories')) return;
        const root = document.getElementById('categories-root');
        if (!root || root.closest('main').hidden) return;
        const id = new URL(location.href).searchParams.get('id');
        if (!id) { const input = root.querySelector('.topic-search'); if (input?.value) { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); e.preventDefault(); } return; }
        const parent = model?.tiles.find(t => t.id === id)?.card;
        e.preventDefault(); SiteNavigation.show(new URL(parent && parent.tiles.length > 1 ? 'categories?id=' + encodeURIComponent(parent.id) : 'categories', location.href), { restore: false });
    });
    document.addEventListener('screenchange', e => { if (e.detail === 'categories') renderCategories(); if (e.detail === 'read') paintSource(); });
    load().then(paintSource).catch(() => {});
    if (location.pathname.replace(/\.html$/, '').endsWith('/categories')) renderCategories();
    return { modeTransition, load, grid, row, icon, mark, skeleton, reveal, transition, pageDirection, el, button, sheet, detail, narrationList, openCategory, setSource, openInRead, paintSource };
})();
