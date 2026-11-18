/* Chain of narration and narrator profiles, ported from Android ui/about/ScienceOfHadithScreen.kt
   (NarrationChainRoute, NarratorProfileRoute, ChainDialog) and data/NarratorRepository.kt. The data is
   data/narrators/v1, built from Android's narrators.db by tools/build-narrators.py. Wording matches Android. */
const Narrators = (() => {
    const BASE = 'data/narrators/v1/', PAGE_SIZE = 20;
    const GAPS = new Set(['aj30000', 'aj30001', 'aj30002', 'aj1131']);
    const files = new Map();
    const load = path => {
        if (!files.has(path)) files.set(path, fetch(BASE + path).then(r => { if (!r.ok) throw Error(path); return r.json(); })
            .catch(error => { files.delete(path); throw error; }));
        return files.get(path);
    };
    const index = () => load('index.json');
    /** Same as fnv1a in tools/build-narrators.py. */
    function shardOf(text, count) {
        let h = 0x811c9dc5;
        for (const b of new TextEncoder().encode(text)) h = Math.imul(h ^ b, 0x01000193) >>> 0;
        return h % count;
    }
    const bare = urn => String(urn).replace(/^urn:/, '');
    async function report(urn) {
        const id = bare(urn), meta = await index();
        return (await load(`chains/${Number(id) % meta.chains}.json`))[id] || null;
    }
    async function profile(id) {
        const meta = await index();
        return (await load(`people/${shardOf(id, meta.people)}.json`))[id] || null;
    }

    /* ---- Small builders ---- */
    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }
    function action(text, onClick, className = 'narrator-link') {
        const b = el('button', className, text); b.type = 'button'; b.addEventListener('click', onClick); return b;
    }
    const arabic = (text, className = 'narrator-arabic') => { const p = el('p', className, text); p.lang = 'ar'; p.dir = 'rtl'; return p; };

    let meta = null;
    const person = id => { const [name, ar, generation, students] = meta.names[id] || [id, id, null, 0]; return { id, name, arabic: ar, generation, students }; };
    /** False for a chain name no profile has been matched to (its name is still the Arabic) and for a gap marker. */
    const profiled = p => p.name !== p.arabic && !GAPS.has(p.id.split('-')[0]);
    const source = ([work, locator]) => { const [author, title, edition, url, reuse] = meta.works[work]; return { citation: `${author}, ${title} · ${locator}`, edition, url, reuse }; };
    const generationLabel = g => /^\d+$/.test(g) ? `Class ${g} of 12` : g;

    function sourceLine(src, { edition = false, prefix = '' } = {}) {
        const box = el('div', 'narrator-source');
        const a = el('a', '', prefix + src.citation); a.href = src.url; a.target = '_blank'; a.rel = 'noopener';
        box.append(a);
        if (edition) box.append(el('p', 'narrator-cite', src.edition));
        return box;
    }
    function heading(eyebrow, title) {
        const h = el('div', 'narrator-section');
        h.append(el('p', 'narrator-eyebrow', eyebrow));
        if (title) h.append(el('h3', '', title));
        return h;
    }
    function node(p, { sub, wording, src, kinship, onOpen } = {}) {
        const card = el(profiled(p) ? 'button' : 'div', 'narrator-node');
        if (profiled(p)) { card.type = 'button'; card.addEventListener('click', onOpen); card.setAttribute('aria-label', `Open ${p.name}’s profile`); }
        // A name with no matched profile is shown as the dataset writes it, in Arabic only; a marked gap has English.
        if (p.name !== p.arabic) card.append(el('strong', '', p.name));
        card.append(arabic(p.arabic, 'narrator-arabic' + (profiled(p) ? ' is-soft' : ' is-large')));
        if (sub) card.append(el('small', '', sub));
        if (wording) card.append(arabic(wording, 'narrator-wording'));
        if (src) card.append(sourceLine(src));
        if (kinship) card.append(sourceLine(kinship, { prefix: 'Kinship · ' }));
        return card;
    }
    function prophet() {
        const card = el('div', 'narrator-prophet');
        card.append(el('strong', '', 'Prophet Muhammad ﷺ'), arabic('محمد رسول الله ﷺ'), el('small', '', 'Every chain begins here'));
        return card;
    }
    const linked = child => { const wrap = el('div', 'narrator-step is-linked'); wrap.append(child); return wrap; };
    const body = (text, className = 'narrator-body') => el('p', className, text);

    /* ---- The dialog: a trail of pages, "c:<urn>" for a chain, otherwise a narrator id. ---- */
    let modal = null, trail = [], view = null, titleEl = null, opener = null;
    function ensure() {
        if (modal) return;
        modal = el('div', 'modal narrator-modal'); modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-hidden', 'true');
        const panel = el('div', 'modal-panel'), head = el('div', 'narrator-head');
        const back = action('', () => go(trail.slice(0, -1)), 'quiet-icon narrator-back');
        back.setAttribute('aria-label', 'Back');
        back.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
        titleEl = el('h2', ''); titleEl.id = 'narrator-title'; modal.setAttribute('aria-labelledby', titleEl.id);
        view = el('div', 'narrator-view');
        head.append(back, titleEl); panel.append(head, view); modal.append(panel); document.body.append(modal);
        modal.addEventListener('click', e => { if (e.target === modal) go([]); });
        modal.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); go(trail.slice(0, -1)); } });
    }
    async function go(pages) {
        trail = pages;
        const page = trail[trail.length - 1];
        if (!page) { closeSheet(modal); return; }
        if (!modal.classList.contains('is-open')) openSheet(modal, opener);
        view.replaceChildren(body(page.startsWith('c:') ? 'Loading chain…' : 'Loading profile…'));
        titleEl.textContent = page.startsWith('c:') ? 'Chain of narration' : 'Narrator profile';
        const serial = ++renders;
        try {
            meta = await index();
            const content = page.startsWith('c:') ? await chainPage(page.slice(2)) : await profilePage(page, trail.findLast(p => p.startsWith('c:'))?.slice(2));
            if (serial !== renders) return;
            view.replaceChildren(content); view.scrollTop = 0;
        } catch (error) {
            console.error(error);
            if (serial === renders) view.replaceChildren(body('Could not load this page. Check your connection and try again.'));
        }
    }
    let renders = 0;
    const openNarrator = id => go([...trail, id]);

    async function chainPage(urn) {
        const r = await report(urn), out = el('div', 'narrator-page');
        if (!r) { out.append(body('No chain is on file for this hadith.')); return out; }
        const src = source(r.s);
        const card = el('div', 'narrator-card');
        card.append(el('h3', '', r.t));
        // Dataset chains carry a one-line credit; the full citation is on the Licenses page.
        if (src.url.includes('hadith-kg')) card.append(body('Chain from the Al-Jami Hadith Knowledge Graph · CC BY 4.0', 'narrator-cite'));
        else card.append(sourceLine(src, { edition: true }));
        if (r.i.trim()) {
            const isnad = arabic(r.i, 'narrator-isnad'); isnad.hidden = true;
            const toggle = action('Show Arabic isnād', () => { isnad.hidden = !isnad.hidden; toggle.textContent = isnad.hidden ? 'Show Arabic isnād' : 'Hide Arabic isnād'; });
            card.append(toggle, isnad);
        }
        out.append(card);
        const routes = r.r.map(([number, prophetFirst, origin, end, steps]) => ({
            number, startsAtProphet: prophetFirst === 1, origin: origin == null ? '' : meta.notes[origin], endNote: end == null ? null : meta.notes[end],
            steps: steps.map(([id, wording, family]) => ({ person: person(id), wording, family: family && { label: family[0], source: source(family[1]) } })),
        }));
        if (routes.some(route => route.startsAtProphet)) out.append(prophet());
        const only = routes.length === 1;
        for (const route of routes) {
            const block = el('div', 'narrator-route');
            const list = el('div', 'narrator-steps');
            route.steps.forEach((step, i) => {
                const sub = [
                    profiled(step.person) ? null : step.person.name === step.person.arabic ? 'Profile not in this app yet' : 'Marked as a gap in the dataset',
                    i === 0 && route.startsAtProphet ? 'Companion' : null,
                    i === route.steps.length - 1 && route.endNote != null ? 'Compiler · wrote this hadith down in his book' : null,
                    step.family ? `${step.family.label} → student` : null,
                ].filter(Boolean).join(' · ');
                const card = node(step.person, { sub, wording: step.wording, kinship: step.family?.source, onOpen: () => openNarrator(step.person.id) });
                list.append(i > 0 || (only && route.startsAtProphet) ? linked(card) : card);
            });
            const end = el('div', 'narrator-end');
            end.append(body(route.endNote ?? 'The final transmitter shown is the compiler’s source.'));
            if (route.steps.some(s => !profiled(s.person) && s.person.name === s.person.arabic)) end.append(body('A name without a profile is a narrator the scholars’ books record. This app has not linked that profile yet.'));
            if (only && route.origin.trim()) end.append(body(route.origin));
            list.append(end);
            if (!only) {
                const head = action('', () => { const open = list.hidden; list.hidden = !open; head.setAttribute('aria-expanded', String(open)); }, 'narrator-card narrator-route-head');
                const text = el('span', '');
                text.append(el('strong', '', `Route ${route.number} · ${route.steps[0]?.person.name ?? 'Unresolved narrator'}`));
                if (route.origin.trim()) text.append(body(route.origin));
                if (!route.startsAtProphet) text.append(body('Not shown from the Prophet ﷺ: the words may be a Companion’s or a later person’s own, or the first narrator’s profile is not in this app yet.'));
                const last = route.steps[route.steps.length - 1]; if (last) text.append(body('Recorded by ' + last.person.name));
                head.append(text, el('span', 'narrator-chevron', '⌄'));
                list.hidden = route.number !== 1; head.setAttribute('aria-expanded', String(!list.hidden));
                block.append(head);
            }
            block.append(list); out.append(block);
        }
        return out;
    }

    function paged(container, rows, render, more) {
        let shown = 0;
        const button = action(more, () => step());
        const step = () => { rows.slice(shown, shown + PAGE_SIZE).forEach(row => container.insertBefore(render(row), button)); shown += PAGE_SIZE; button.hidden = shown >= rows.length; };
        container.append(button); step();
    }

    async function profilePage(id, urn) {
        const p = await profile(id), who = person(id), out = el('div', 'narrator-page');
        if (!p) { out.append(body('This profile is not in this app yet.')); return out; }
        const companion = who.generation === 'Companion', own = source(p.s);
        const identity = el('div', 'narrator-card' + (companion ? ' is-selected' : ''));
        identity.append(el('h3', '', who.name), arabic(who.arabic, 'narrator-arabic is-title'));
        const chips = el('div', 'narrator-chips');
        const chip = text => chips.append(el('span', 'narrator-chip', text));
        if (who.generation) chip(generationLabel(who.generation));
        if (p.b != null) chip(p.b < 0 ? `Born ${-p.b} years before the Hijrah` : `Born ${p.b} AH`);
        if (p.d != null) chip(`Died ${p.d} AH`);
        (p.al || []).forEach(([alias, kind]) => chip(`${kind} · ${alias}`));
        identity.append(chips); out.append(identity);

        out.append(heading('Standing', 'What the critics said'));
        const verdicts = p.as || [];
        // Same words as Android's RANKS.first() for a Companion.
        if (!verdicts.length) out.append(body(companion ? 'Met the Prophet ﷺ as a believer. Hadith scholars accept every Companion as upright, so critics do not grade them.' : 'No assessment is included in this edition.'));
        for (const [critic, ar, meaning] of verdicts) {
            const card = el('div', 'narrator-card narrator-verdict');
            card.append(arabic(ar, 'narrator-arabic is-verdict'), el('p', 'narrator-meaning', meaning), el('p', 'narrator-critic', critic));
            out.append(card);
        }

        out.append(heading('About'), body(p.bio));
        if (p.pl) out.append(body(p.pl));

        const r = urn ? await report(urn) : null;
        const reportLinks = [];
        let origin = null;
        if (r) {
            for (const [, , o, , steps] of r.r) {
                const at = steps.findIndex(([pid]) => pid === id);
                if (at < 0) continue;
                if (at === 0 && origin == null) origin = o == null ? '' : meta.notes[o];
                if (steps[at - 1]) reportLinks.push([steps[at - 1][0], 'Received from']);
                if (steps[at + 1]) reportLinks.push([steps[at + 1][0], 'Passed to']);
            }
            const seen = new Set(), unique = reportLinks.filter(([pid, label]) => !seen.has(pid + label) && seen.add(pid + label));
            out.append(heading('In this report'));
            if (origin != null) { out.append(body(origin), sourceLine(source(r.s))); }
            else if (!unique.length) out.append(body('No teacher or student link in the reviewed routes.'));
            unique.forEach(([pid, label]) => out.append(node(person(pid), { sub: label, onOpen: () => openNarrator(pid) })));
            reportLinks.splice(0, reportLinks.length, ...unique);
        }
        const exclude = label => new Set(reportLinks.filter(l => l[1] === label).map(l => l[0]));
        const link = ([pid, src]) => { const s = source(src); return node(person(pid), { src: s.url.includes('hadith-kg') ? null : s, onOpen: () => openNarrator(pid) }); };
        const teachers = (p.tch || []).filter(([pid]) => !exclude('Received from').has(pid));
        const students = (p.stu || []).filter(([pid]) => !exclude('Passed to').has(pid));
        if (teachers.length) { out.append(heading('Learned from')); const box = el('div', 'narrator-list'); out.append(box); paged(box, teachers, link, 'Show more teachers'); }
        if (students.length) { out.append(heading(urn ? 'Also taught' : 'Taught')); const box = el('div', 'narrator-list'); out.append(box); paged(box, students, link, 'Show more students'); }
        if (teachers.length || students.length) out.append(body('Links without a named book come from the Al-Jāmiʿ chain dataset. They await review and do not by themselves prove that two people met.'));

        if (p.car?.length) {
            out.append(heading('In this app', 'Hadith with this person in the chain'));
            const box = el('div', 'narrator-list'); out.append(box);
            const row = carriedUrn => {
                const b = action('…', () => go([...trail, 'c:' + carriedUrn]), 'narrator-node narrator-carried');
                load(`titles/${Number(carriedUrn) % meta.titles}.json`).then(t => { b.textContent = t[carriedUrn] || carriedUrn; }).catch(() => {});
                return b;
            };
            paged(box, p.car, row, 'Show more hadith');
            out.append(body('Chains come from the Al-Jāmiʿ dataset, matched to each hadith by its Arabic text. They await review.'));
        }
        if (p.fam?.length) {
            out.append(heading('Family'));
            p.fam.forEach(([pid, label, src]) => { const s = source(src); out.append(node(person(pid), { sub: label, src: s.url.includes('hadith-kg') ? null : s, onOpen: () => openNarrator(pid) })); });
        }
        out.append(heading('Source'), sourceLine(own, { edition: true }));
        const seen = new Set([own.citation]);
        for (const [, , , src] of verdicts) { const s = source(src); if (!seen.has(s.citation)) { seen.add(s.citation); out.append(sourceLine(s, { edition: true })); } }
        if (own.reuse.trim()) out.append(body(own.reuse));
        return out;
    }

    /* ---- The Read row's chain button ---- */
    // Read may be mounted after this script (another tab opened first), so the button is looked up each time.
    let shown = null;
    document.addEventListener('click', event => { const b = event.target.closest?.('#chain-btn'); if (b && shown) open(shown, b); });
    async function show(urn) {
        const button = document.getElementById('chain-btn');
        shown = null; if (button) button.hidden = true;
        if (!urn || !button) return;
        const want = bare(urn);
        try { if (await report(want) && current?.key === urn) { shown = want; button.hidden = false; } } catch { /* offline without the chains: no button */ }
    }
    function open(urn, anchor) { ensure(); opener = anchor || document.activeElement; go(['c:' + bare(urn)]); }
    return { show, open, report, profile, shardOf };
})();
if (typeof current !== 'undefined' && current?.key) Narrators.show(current.key);
