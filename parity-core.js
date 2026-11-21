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
    // Display copy from Android's TopicDisplayTitles.kt and TopicVisuals.kt.
    const topicDisplayTitles = {
        "seerah-events": "The Prophet's Life Events",
        "love-of-allah-and-messenger": "Loving Allah and His Messenger",
        "sunnah-and-innovation": "Sunnah and Innovation",
        "magic-omens-fortune-telling": "Magic, Omens and Divination",
        "tafsir": "Qur'an Commentary (Tafsir)",
        "wudu": "Performing Wudu",
        "water-and-impurities": "Water, Vessels and Impurity",
        "virtue-of-prayer": "Prayer: Duty and Virtue",
        "adhan-and-iqamah": "Adhan and Iqamah",
        "prayer-ending": "Tashahhud and Closing Prayer",
        "prayer-mistakes": "Prayer Errors and Forgetfulness",
        "congregation-reward": "Congregational Prayer",
        "travel-prayer": "Travel Prayer",
        "prayer-illness": "Praying Seated or When Ill",
        "recipients-of-charity": "Zakat and Charity Recipients",
        "voluntary-charity": "Voluntary Charity",
        "ongoing-charity": "Ongoing Charity",
        "everyday-good-as-charity": "Good Deeds as Charity",
        "caring-for-orphans-and-needy": "Care for Orphans and the Needy",
        "virtues-of-hajj": "Hajj: Duty and Virtue",
        "muhrim-restrictions": "Ihram Restrictions",
        "daily-adhkar": "Daily Remembrances",
        "deeds-and-reward": "Good Deeds and Rewards",
        "trustworthiness-promises": "Trusts, Promises and Secrets",
        "forgiving-others": "Forgiving Others",
        "keeping-secrets": "Keeping Confidences",
        "religious-verdicts": "Asking and Giving Rulings",
        "narrating-hadith": "Narrating and Writing Hadith",
        "scholars-and-their-status": "The Status of Scholars",
        "seeking-permission": "Permission and Privacy",
        "rights-of-the-road": "Road and Public Etiquette",
        "visiting-and-meeting": "Visits and Meetings",
        "disability-and-chronic-illness": "Disability and Chronic Illness",
        "caring-for-the-sick": "Caring for the Sick",
        "after-a-sin": "After a Sin",
        "addiction-and-bad-habits": "Struggling With Bad Habits",
        "missed-prayer-now": "When You Miss a Prayer",
        "new-muslim-now": "Becoming Muslim",
        "work-and-earning": "Finding Work and Earning",
        "starting-work-or-business": "Starting Work or Business",
        "persecuted-for-faith": "Persecuted for Faith",
        "aqiqah-and-newborn": "Aqiqah and Newborns",
        "forbidden-marriages": "Forbidden Marriages",
        "wedding": "Wedding and Walimah",
        "spousal-rights": "Spouses' Rights",
        "iddah-and-mourning": "Iddah and Mourning",
        "marital-conflict": "Spousal Disputes",
        "rights-of-muslims-on-each-other": "Mutual Rights of Muslims",
        "earning-and-work": "Work and Earning",
        "drinking-etiquette": "Drinking Manners and Vessels",
        "moderation-and-waste": "Food Moderation and Waste",
        "hair-and-grooming": "Hair, Beard and Fitrah Grooming",
        "hudud": "Hudud: General Rules",
        "discrimination": "Discrimination and Unfairness",
        "leadership-responsibility": "Duties of Leadership",
        "seeking-office": "Seeking Office"
    };
    const singleWordTopicContexts = {
        "purification": "Ritual Cleanliness",
        "angels": "Made of Light",
        "jinn": "Made of Fire",
        "mosques": "Places of Worship",
        "witr-prayer": "The Odd Prayer",
        "umrah": "The Minor Pilgrimage",
        "patience": "Steadfastness",
        "self-accountability": "Examining Our Deeds",
        "generosity": "Giving Freely",
        "courage": "Facing Fear",
        "anger": "Managing Anger",
        "grief-and-loss": "After a Loss",
        "loneliness": "Feeling Alone",
        "hopelessness-and-despair": "Finding Hope",
        "being-wronged": "Facing Injustice",
        "being-praised": "Receiving Praise",
        "parents": "Honouring Parents",
        "intimacy": "Between Spouses",
        "neighbours": "Their Rights",
        "gifts": "Giving and Receiving",
        "sleep": "Bedtime and Waking",
        "travel": "On a Journey",
        "intoxicants": "Prohibited Drinks",
        "hunting": "Game and Hunting",
        "clothing": "What to Wear",
        "inheritance": "Shares and Heirs",
        "intercession": "On Judgement Day",
        "paradise": "The Garden",
        "hellfire": "The Fire"
    };

    function topicDisplayTitle(topic) {
        return topicDisplayTitles[topic.id] || topic.title;
    }

    function twoLineTopicLabel(topic, categoryTitle, width) {
        const title = topicDisplayTitle(topic);
        let lines = [title, singleWordTopicContexts[topic.id] || categoryTitle];
        let widest = Infinity;
        for (let split = title.indexOf(' '); split > 0; split = title.indexOf(' ', split + 1)) {
            const candidate = [title.slice(0, split), title.slice(split + 1)];
            const size = Math.max(...candidate.map(width));
            if (size < widest) { lines = candidate; widest = size; }
        }
        return lines;
    }

    class Categories {
        constructor(spec, taxonomy, labels, art = {}, shorts = {}, finder = {}) {
            this.spec = spec; this.labels = labels.labels || labels; this.art = art; this.shorts = shorts; this.finder = finder;
            // extraTopics: audited labels that are no taxonomy subtopic (Android, 21 November: Ramadan's virtues).
            this.entries = new Map([...taxonomy.situations, ...taxonomy.topics.flatMap(t => t.subtopics), ...(spec.extraTopics || [])].map(t => [t.id, { ...t, blurb: t.description || t.blurb || '' }]));
            const categories = new Map(taxonomy.topics.map(t => [t.id, t]));
            this.shelves = spec.shelves.map(s => ({ title: s.title, cards: s.cards.map(c => {
                const category = categories.get(c.id);
                const groups = (c.groups?.length ? c.groups : [{ from: c.id }]).map(g => ({ title: g.title,
                    // 'except' leaves topics out of 'from' (Fasting without Ramadan's, which have their own card).
                    tiles: [...(categories.get(g.from)?.subtopics.map(t => t.id).filter(id => !(g.except || []).includes(id)) || []), ...(g.ids || [])].filter(id => this.entries.has(id)).map(id => ({
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
    /**
     * The next narration of a source, a round at a time (Android's DrawEngine.drawFrom, 21 November): every narration
     * of the chosen grade once, in random order, before any repeats. The one on screen is passed over, not used up.
     * A new round never opens on the narration just read unless it is the only one. [rounds] is a Map kept for the
     * page's life, keyed by source and grade, so going back to a source resumes its round. Null when nothing in the
     * source has the grade: the caller says so, and never draws from another grade.
     */
    function nextInRound(rounds, key, urns, codeByUrn, code, current, random = Math.random) {
        const showing = current ? String(current).replace(/^urn:/, '') : null;
        const eligible = unique(urns).filter(u => !code || codeByUrn[u] === code);
        if (!eligible.length) return null;
        if (!rounds.has(key)) rounds.set(key, { shown: new Set(), last: null });
        const round = rounds.get(key), any = list => list[Math.floor(random() * list.length)];
        const fresh = eligible.filter(u => !round.shown.has(u) && u !== showing);
        let pick;
        if (fresh.length) pick = any(fresh);
        else {
            const others = eligible.filter(u => u !== showing);
            const away = others.filter(u => u !== round.last);
            pick = any(away.length ? away : others.length ? others : eligible);
            round.shown.clear();
        }
        round.shown.add(pick); round.last = pick;
        return pick;
    }
    function balancedRows(count, columns) {
        const rows = Math.ceil(count / columns);
        return Array.from({ length: rows }, (_, i) => Math.floor(count / rows) + Number(i < count % rows));
    }
    const api = { Local, Categories, unique, fold, words, stem, recent, historyAfterDisplay, queryAfterUse, sourceCandidates, nextInRound, balancedRows, topicDisplayTitle, twoLineTopicLabel };
    if (typeof module !== 'undefined') module.exports = api;
    root.Parity = api;
})(globalThis);
