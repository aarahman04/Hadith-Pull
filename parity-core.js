/* Pure shared models; no DOM, network, or religious-content transformations. */
(function (root) {
    const memory = new Map();
    const Local = {
        get(key, fallback = null) {
            try { const value = localStorage.getItem(key); return value == null ? (memory.get(key) ?? fallback) : JSON.parse(value); }
            catch { return memory.get(key) ?? fallback; }
        },
        set(key, value) {
            memory.set(key, value);
            try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
        }
    };
    const unique = list => [...new Set(list)];
    const fold = text => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/['’ʿʾ`]/g, '');
    const words = text => fold(text).match(/[\p{L}\p{N}]+/gu) || [];
    const stem = w => w.length > 5 && w.endsWith('ing') ? w.slice(0, -3) : w.length > 4 && w.endsWith('ies') ? w.slice(0, -3) + 'y' : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w;
    class Categories {
        constructor(spec, taxonomy, labels, art = {}, shorts = {}, finder = {}) {
            this.spec = spec; this.labels = labels.labels || labels; this.art = art; this.shorts = shorts; this.finder = finder;
            this.entries = new Map([...taxonomy.situations, ...taxonomy.topics.flatMap(t => t.subtopics)].map(t => [t.id, { ...t, blurb: t.description || t.blurb || '' }]));
            const categories = new Map(taxonomy.topics.map(t => [t.id, t]));
            this.shelves = spec.shelves.map(s => ({ title: s.title, cards: s.cards.map(c => {
                const category = categories.get(c.id);
                const groups = (c.groups?.length ? c.groups : [{ from: c.id }]).map(g => ({ title: g.title,
                    tiles: [...(categories.get(g.from)?.subtopics.map(t => t.id) || []), ...(g.ids || [])].filter(id => this.entries.has(id)).map(id => ({
                        ...this.entries.get(id), title: c.names?.[id] || this.entries.get(id).title,
                        icon: art.named?.[c.icons?.[id]] || art.named?.[g.icon] || (g.from !== c.id && art.categories?.[g.from]) || art.named?.[c.icon] || art.categories?.[c.id]
                    })) }));
                const tiles = [...new Map(groups.flatMap(g => g.tiles).map(t => [t.id, t])).values()];
                return { ...c, title: c.title || category?.title, blurb: c.blurb || category?.description || '', groups, tiles,
                    icon: art.named?.[c.icon] || art.categories?.[c.id], caption: `${tiles.length} topic${tiles.length === 1 ? '' : 's'}` };
            }) }));
            this.cards = this.shelves.flatMap(s => s.cards);
            this.tiles = [...new Map(this.cards.flatMap(c => c.tiles.map(t => [t.id, { ...t, card: c }])).reverse()).values()].reverse();
        }
        saved(id) { const key = this.spec.moved[id] || id; return this.cards.some(c => c.id === key) || this.entries.has(key) ? key : null; }
        card(id) { return this.cards.find(c => c.id === (this.spec.moved[id] || id)); }
        choice(id) { return this.card(id) || this.tiles.find(t => t.id === id) || this.entries.get(id); }
        title(id) { return this.choice(id)?.title || 'All hadith'; }
        eyebrow(id) { return this.shorts[id] || this.title(id).split(':')[0].trim(); }
        urns(id) { const saved = this.saved(id); return saved ? unique((this.card(saved)?.tiles.map(t => t.id) || [saved]).flatMap(t => this.labels[t] || [])) : []; }
        find(query) {
            const typed = words(query), stop = new Set(this.finder.stopWords || []);
            let asked = typed.filter(w => !stop.has(w)); if (!asked.length) asked = typed;
            if (!asked.length) return [];
            const forms = asked.map(w => unique([stem(w), ...(this.finder.synonyms?.[w] || this.finder.synonyms?.[stem(w)] || [])]));
            const searchables = [...this.cards.filter(c => c.tiles.length > 1).map(c => ({ ...c, isCard: true, where: c.caption, searchTitle: c.title + ' ' + c.gridTitle })),
                ...this.tiles.map(t => ({ ...t, where: 'Topic · ' + t.card.title, searchTitle: t.title + ' ' + this.entries.get(t.id).title + (t.card.tiles.length === 1 ? ' ' + t.card.gridTitle : '') }))];
            const scored = searchables.map((s, order) => {
                const title = words(s.searchTitle), body = words(s.blurb);
                const hit = (text, f) => text.some(w => w.startsWith(f));
                const per = forms.map(f => f.some(w => hit(title, w)) ? 3 : f.some(w => hit(body, w)) ? 1 : 0);
                return { ...s, order, count: per.filter(Boolean).length, score: per.reduce((a, b) => a + b, 0) };
            }).filter(s => s.count);
            const best = Math.max(...scored.map(s => s.count));
            return scored.filter(s => s.count === best).sort((a, b) => b.score - a.score || Number(!!b.isCard) - Number(!!a.isCard) || a.order - b.order);
        }
    }
    function recent(list, value, limit) { return [value, ...list.filter(x => x !== value)].slice(0, limit); }
    function historyAfterDisplay(list, key) { return recent((Array.isArray(list) ? list : []).filter(k => /^urn:\d+$/.test(k)), key, 11); }
    function queryAfterUse(list, query) {
        const text = query.trim();
        list = (Array.isArray(list) ? list : []).filter(q => typeof q === 'string');
        return text ? [text, ...list.filter(q => q.toLowerCase() !== text.toLowerCase())].slice(0, 5) : list;
    }
    function sourceCandidates(urns, codeByUrn, code, current) {
        const all = unique(urns), others = all.filter(u => 'urn:' + u !== current);
        const available = others.length ? others : all;
        const matching = available.filter(u => !code || codeByUrn[u] === code);
        return matching.length ? matching : available;
    }
    function balancedRows(count, columns) {
        const rows = Math.ceil(count / columns);
        return Array.from({ length: rows }, (_, i) => Math.floor(count / rows) + Number(i < count % rows));
    }
    const api = { Local, Categories, unique, fold, words, stem, recent, historyAfterDisplay, queryAfterUse, sourceCandidates, balancedRows };
    if (typeof module !== 'undefined') module.exports = api;
    root.Parity = api;
})(globalThis);
