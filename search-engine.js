/* Port of Android data/search/SearchEngine.kt and domain/search. Executes its shipped FTS4 index. */
(function (root) {
    const STOP = new Set(`a an the and or but if of to in on at by for from with without into onto over under about above below as than then so too very just only also not no nor is are was were be been being am do does did done have has had having it its this that these those there here he him his she her hers they them their theirs we us our you your yours i me my mine who whom whose which what when where why how all any some each every both either neither one ones can could will would shall should may might must hadith hadiths narration narrations narrated narrates report reported reports story regarding remember remembered think thought something someone somebody thing things like said says say tell told im ive id youre youve weve theyre dont doesnt didnt cant cannot wont isnt arent wasnt werent hasnt havent shouldnt couldnt wouldnt thats whats lets heres theres anything everything stuff please really lot lots lately recently related relating relates want wants wanted wanting keep keeps kept`.split(' '));
    const unique = a => [...new Set(a)];
    const foldEnglish = text => text.replace(/[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/g, ' ').normalize('NFKD').replace(/\p{Mn}/gu, '').replace(/['‘’`ʼʾʿ´]/g, '').toLowerCase().split(/[\s\u001c-\u001f\u0085]+/).filter(Boolean).join(' ');
    const foldArabic = text => text.normalize('NFKC').replace(/\p{Cf}/gu, '').replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06edـ]/g, '').replace(/[آأإٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').split(/[\s\u001c-\u001f\u0085]+/).filter(Boolean).join(' ');
    const englishWords = text => text.match(/[a-z0-9]+/g) || [];
    const isArabic = text => /[ء-يٱ-ۓ]/.test(text);
    const contentWords = words => { const found = words.filter((w, i) => !STOP.has(w) && !(['looking', 'search', 'searching'].includes(w) && words[i + 1] === 'for')); return found.length ? found : words; };
    const quote = text => '"' + text.replace(/"/g, '') + '"';
    function editDistance(a, b, limit) {
        let before = Array(b.length + 1).fill(0), previous = Array.from({ length: b.length + 1 }, (_, i) => i), current = [];
        for (let i = 1; i <= a.length; i++) {
            current[0] = i; let minimum = i;
            for (let j = 1; j <= b.length; j++) {
                let value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + Number(a[i - 1] !== b[j - 1]));
                if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) value = Math.min(value, before[j - 2] + 1);
                current[j] = value; minimum = Math.min(minimum, value);
            }
            if (minimum > limit) return limit + 1;
            [before, previous, current] = [previous, current, before];
        }
        return Math.min(previous[b.length], limit + 1);
    }
    const collectionNames = [
        ['shahwaliullah40', '(?:(?:40|forty) hadith (?:of )?)?shah ?wali ?ullah(?: (?:40|forty)(?: hadith)?)?'],
        ['qudsi40', '(?:(?:40|forty) )?(?:hadith|ahadith) (?:e )?qudsi|qudsi(?: (?:40|forty))?'],
        ['nawawi40', '(?:(?:40|forty) hadith (?:of )?(?:al |an |imam )?nawawi|(?:al |an )?arbain (?:al |an )?nawawi|(?:al |an |imam )?nawawi(?: (?:40|forty) hadith)?)'],
        ['bukhari', '(?:sahih )?(?:al |el |imam )?bukh?ari|bukhary'], ['muslim', '(?:sahih )?muslim'],
        ['abudawud', '(?:sunan )?(?:abi|abu|aboo) ?(?:dawud|dawood|daud|dawod|dawuud|dawoud)'],
        ['tirmidhi', '(?:jami|jamia|sunan)? ?(?:at |al )?(?:tirmidhi|tirmizi|tirmithi|tirmidi|termizi)'],
        ['nasai', '(?:sunan )?(?:an |al )?(?:nasai|nisai|nasaai|nasa i)'], ['ibnmajah', '(?:sunan )?(?:ibn|ibnu|ibne|bin) ?(?:majah|maja|maajah|majjah)'],
        ['bukhari', '(?:صحيح )?البخاري'], ['muslim', '(?:صحيح )?مسلم'], ['abudawud', '(?:سنن )?ابي? داود'], ['tirmidhi', '(?:جامع |سنن )?الترمذي'], ['nasai', '(?:سنن )?النسائي'], ['ibnmajah', '(?:سنن )?ابن ماجه']
    ].map(([id, pattern]) => [id, new RegExp('(?<![a-zء-ي])(?:' + pattern + ')(?![a-zء-ي])')]);
    function parseReference(text) {
        const raw = text.trim().replace(/[٠-٩۰-۹]/g, c => String(c.charCodeAt(0) & 15)), lower = raw.toLowerCase();
        let m = raw.match(/hadithpull\.online\/(?:h\/?\?(?:k|h)=|\?h=)(\S+)/);
        if (m) { try { return [{ key: decodeURIComponent(m[1]) }, '']; } catch { return null; } }
        m = lower.match(/(?:sunnah\.com\/urn\/|^urn:)(\d+)/); if (m) return [{ urn: m[1] }, ''];
        m = lower.match(/sunnah\.com\/([a-z0-9]+)[:/](\d+)\s*([a-z])?(?![a-z0-9])/);
        if (m) return [{ collection: collectionNames.find(([, re]) => re.test(m[1]))?.[0] || m[1], number: +m[2], letter: m[3] || null }, ''];
        const folded = foldArabic(raw.split(' ').map(w => isArabic(w) ? w : foldEnglish(w)).join(' ')).replace(/[^a-z0-9ء-ي]+/g, ' ').trim();
        const c = collectionNames.find(([, re]) => re.test(folded)); if (!c) return null;
        const rest = folded.replace(c[1], ' ');
        m = rest.match(/\bbook (\w+)\D{0,12}?(\d+)\b/);
        if (m) return [{ collection: c[0], book: m[1], inBook: m[2] }, rest.replace(m[0], '').replace(/\bhadith\b/g, ' ').trim()];
        m = rest.match(/(?<![a-z0-9])(\d+) ?([a-z])?(?![a-z0-9])/);
        return m ? [{ collection: c[0], number: +m[1], letter: m[2] || null }, rest.replace(m[0], '').trim()] : null;
    }
    class SearchEngine {
        constructor(db, labels = {}, taxonomy = { topics: [], situations: [] }, legacy = {}) {
            this.db = db; this.legacy = legacy;
            this.categories = taxonomy.topics;
            this.refs = new Map(this.rows('SELECT id,urn,collection,ref,book,inBook,cat FROM refs').map(r => [r[0], { id: r[0], urn: r[1], collection: r[2], ref: r[3] || '', book: r[4], inBook: r[5], cat: r[6] }]));
            this.size = Math.max(...this.refs.keys()); this.idOf = new Map([...this.refs.values()].map(r => [r.urn, r.id]));
            this.vocab = new Map(this.rows('SELECT word,df FROM vocab'));
            this.exactWords = new Set(this.rows('SELECT word FROM exactwords').flat());
            this.labels = new Map(Object.entries(labels.labels || labels).map(([id, urns]) => [id, new Set(urns.map(u => this.idOf.get(u)).filter(Boolean))]));
            for (const t of taxonomy.topics) this.labels.set(t.id, new Set(t.subtopics.flatMap(s => [...(this.labels.get(s.id) || [])])));
            this.names = new Map([...taxonomy.topics.flatMap(t => t.subtopics), ...taxonomy.situations].map(t => [t.id, t.title + ' ' + (t.description || t.blurb || '')]));
            this.synCache = new Map(); this.correctCache = new Map();
        }
        rows(sql, params = []) { const stmt = this.db.prepare(sql); try { stmt.bind(params); const out = []; while (stmt.step()) out.push(stmt.get()); return out; } finally { stmt.free(); } }
        idf(df) { return Math.log(1 + (this.size - df + .5) / (df + .5)); }
        prior(doc) { return { sahih: 1, hasan: .97 }[this.refs.get(doc).cat] || .94; }
        resolve(ref) {
            if (ref.key) return this.resolve({ urn: ref.key.startsWith('urn:') ? ref.key.slice(4) : this.legacy[ref.key] });
            if (ref.urn) return this.idOf.has(ref.urn) ? [ref.urn] : [];
            const candidates = [...this.refs.values()].filter(r => r.collection === ref.collection);
            if (ref.book) return candidates.filter(r => String(r.book).toLowerCase() === ref.book && String(r.inBook) === ref.inBook).slice(0, 1).map(r => r.urn);
            const found = [];
            for (const r of candidates) {
                const range = r.ref.trim().match(/^(\d+)\s*-\s*(\d+)$/); if (range) continue;
                let number;
                for (const part of r.ref.split(',')) {
                    const m = part.trim().match(/^(\d+)?\s*([a-z])?$/); if (!m) continue;
                    if (m[1]) number = +m[1]; if (number === ref.number) found.push({ r, letter: m[2] || null });
                }
            }
            found.sort((a, b) => (a.letter || '').localeCompare(b.letter || ''));
            const exact = found.filter(f => f.letter === ref.letter);
            if (found.length) return unique((exact.length ? exact : found).map(f => f.r.urn));
            return candidates.filter(r => { const m = r.ref.match(/^(\d+)\s*-\s*(\d+)$/); return m && ref.number >= +m[1] && ref.number <= +m[2]; }).map(r => r.urn);
        }
        synonyms(word) {
            if (!/^[a-z0-9]+$/.test(word)) return [];
            if (!this.synCache.has(word)) {
                const rows = this.rows('SELECT key,alts,kind FROM syn WHERE syn MATCH ?', ['key:' + word]);
                const exact = rows.filter(r => r[0] === word); this.synCache.set(word, exact.length ? exact : rows);
            }
            return this.synCache.get(word);
        }
        closest(word) {
            if (this.vocab.has(word) || word.length < 3 || /\d/.test(word)) return null;
            if (this.correctCache.has(word)) return this.correctCache.get(word);
            const limit = word.length <= 5 ? 1 : 2; let best = null, distance = limit + 1, count = -1;
            for (const [candidate, df] of this.vocab) {
                if (Math.abs(candidate.length - word.length) > limit) continue;
                const d = editDistance(word, candidate, limit);
                if (d < distance || (d === distance && df > count)) { best = candidate; distance = d; count = df; }
            }
            const result = distance <= limit ? best : null; this.correctCache.set(word, result); return result;
        }
        phrases(words) {
            if (words.length < 2) return [];
            const out = words.slice(0, -1).flatMap((w, i) => !STOP.has(w) || !STOP.has(words[i + 1]) ? [{ text: w + ' ' + words[i + 1], weight: 1.2 }] : []);
            if (words.length >= 4) for (let i = 0; i < Math.min(10, words.length - 2); i++) out.push({ text: words.slice(i, i + 3).join(' '), weight: 1.2 });
            if (words.length >= 3) out.push({ text: words.slice(0, 12).join(' '), weight: 3 });
            return [...new Map(out.reverse().map(a => [a.text, a])).values()].reverse();
        }
        query(text) {
            if (isArabic(text)) {
                const words = foldArabic(text).split(' ').filter(Boolean);
                return { table: 'ar', words: [], corrections: {}, terms: unique(words).slice(0, 12).map(word => ({ word, alts: [{ text: word, weight: 1 }, { text: word.startsWith('ال') && word.length > 3 ? word.slice(2) : 'ال' + word, weight: .8 }] })), phrases: this.phrases(words) };
            }
            const words = englishWords(foldEnglish(text)), corrections = {};
            const terms = unique(contentWords(words)).slice(0, 12).map(word => {
                const alts = new Map([[word, 1]]), rows = this.synonyms(word);
                const add = (rows, scale) => rows.forEach(r => r[1].split(' ').forEach(alt => { const weight = scale * ({ term: .9, wiktionary: .9, name: .95, wordnet: .6 }[r[2]] || .5); alts.set(alt, Math.max(alts.get(alt) || 0, weight)); }));
                if (!this.vocab.has(word) && !rows.length && !/^\d+$/.test(word)) {
                    const fixed = this.closest(word); if (fixed) { corrections[word] = fixed; if (!alts.has(fixed)) alts.set(fixed, .8); add(this.synonyms(fixed), .8); }
                }
                add(rows, 1);
                return { word, alts: [...alts].slice(0, 12).flatMap(([text, weight]) => this.exactWords.has(text) ? [{ text, weight, exact: true }, { text, weight: weight * .3, weak: true }] : [{ text, weight }]) };
            });
            return { table: 'en', words, corrections, terms, phrases: this.phrases(words) };
        }
        exactDocs(alts, within) {
            if (!alts.length) return [];
            return this.rows('SELECT docid FROM exact WHERE exact MATCH ?' + (within ? ` AND docid IN (${within.join(',')})` : ''), [alts.map(a => quote(a.text)).join(' OR ')]).flat();
        }
        matching(table, alts) {
            const stems = alts.filter(a => !a.exact && !a.weak);
            return unique([...(stems.length ? this.rows(`SELECT docid FROM ${table} WHERE ${table} MATCH ?`, [stems.map(a => quote(a.text)).join(' OR ')]).flat() : []), ...this.exactDocs(alts.filter(a => a.exact))]);
        }
        coverage(query) {
            const share = new Float64Array(this.size + 1), mask = new Int32Array(this.size + 1), idf = [];
            query.terms.forEach((t, i) => { const docs = this.matching(query.table, t.alts); idf[i] = this.idf(docs.length); docs.forEach(d => { share[d] += idf[i]; mask[d] |= 1 << i; }); });
            const total = idf.reduce((a, b) => a + b, 0) || 1;
            for (let d = 1; d <= this.size; d++) share[d] /= total;
            return { share, mask, idf };
        }
        near(query) {
            if (query.table !== 'en') return new Map();
            const words = query.words.filter(w => /^[a-z]+$/.test(w) && !this.exactWords.has(w));
            if (words.length < 4 && !query.scattered) return new Map();
            const pairs = new Map(), content = words.filter(w => !STOP.has(w));
            for (let gap = 1; gap < (query.scattered ? content.length : 3); gap++) for (let i = 0; i < content.length - gap; i++) {
                const a = content[i], b = content[i + gap]; if (a !== b && !pairs.has(a + '|' + b)) pairs.set(a + '|' + b, [a, b, query.scattered ? 12 : 6]);
            }
            for (let gap = 1; gap <= 2; gap++) for (let i = 0; i < words.length - gap; i++) {
                const a = words[i], b = words[i + gap]; if (a !== b && STOP.has(a) !== STOP.has(b) && !pairs.has(a + '|' + b)) pairs.set(a + '|' + b, [a, b, 3]);
            }
            const chosen = [...pairs.values()].slice(0, 16), weights = chosen.map(([a, b]) => Math.max(this.idf(this.vocab.get(a) || 0), this.idf(this.vocab.get(b) || 0)));
            const total = weights.reduce((a, b) => a + b, 0), found = new Map();
            chosen.forEach(([a, b, span], i) => this.rows('SELECT docid FROM en WHERE en MATCH ?', [`${a} NEAR/${span} ${b}`]).forEach(([doc]) => found.set(doc, (found.get(doc) || 0) + weights[i] / total)));
            return found;
        }
        bm25(query, candidates, termIdf) {
            const phrases = query.terms.flatMap((t, i) => t.alts.filter(a => !a.exact).map(a => [a, termIdf[i]]));
            phrases.push(...query.phrases.map(a => [a, null]));
            const weights = query.table === 'en' ? [2, 1.5, 1.5, 3, 2.5, 2.5, 2] : [1], out = new Map();
            const rows = this.rows(`SELECT docid,matchinfo(${query.table},'pcnalx') FROM ${query.table} WHERE ${query.table} MATCH ? AND docid IN (${candidates.join(',')})`, [phrases.map(([a]) => quote(a.text)).join(' OR ')]);
            for (const [doc, bytes] of rows) {
                const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), info = Array.from({ length: bytes.length / 4 }, (_, i) => view.getUint32(i * 4, true));
                const [p, c, n] = info; let score = 0;
                for (let phrase = 0; phrase < p; phrase++) {
                    const [alt, knownIdf] = phrases[phrase]; let weighted = 0, docs = 0;
                    for (let col = 0; col < c; col++) {
                        const base = 3 + 2 * c + 3 * (phrase * c + col), hits = info[base]; docs = Math.max(docs, info[base + 2]);
                        if (hits) weighted += (weights[col] || 1) * hits / (.25 + .75 * info[3 + c + col] / Math.max(1, info[3 + col]));
                    }
                    if (weighted) score += alt.weight * (knownIdf ?? Math.log(1 + (Math.max(1, n) - docs + .5) / (docs + .5))) * weighted * 3 / (weighted + 2);
                }
                out.set(doc, score);
            }
            query.terms.forEach((term, i) => term.alts.filter(a => a.exact).forEach(a => this.exactDocs([a], candidates).forEach(doc => out.set(doc, (out.get(doc) || 0) + a.weight * termIdf[i] * weights[0] * 3 / (weights[0] + 2)))));
            return out;
        }
        rank(query, conditions, limit) {
            const cov = this.coverage(query), lead = conditions || cov.share, near = this.near(query);
            const candidates = [...this.refs.keys()].filter(d => lead[d] > 0).sort((a, b) => lead[b] - lead[a] || cov.share[b] - cov.share[a] || (near.get(b) || 0) - (near.get(a) || 0)).slice(0, 300);
            if (!candidates.length) return [];
            const bm = this.bm25(query, candidates, cov.idf);
            return candidates.map(doc => ({ doc, mask: cov.mask[doc], score: (conditions ? conditions[doc] * 1000 : 0) + (bm.get(doc) || 0) * cov.share[doc] ** .5 * (1 + 2 * (near.get(doc) || 0)) * this.prior(doc) })).sort((a, b) => b.score - a.score || a.doc - b.doc).slice(0, limit);
        }
        search(text, limit = 50) {
            const reference = parseReference(text), pinned = reference ? this.resolve(reference[0]) : [];
            const rest = pinned.length ? reference[1] : text;
            const query = this.query(rest);
            if (!query.terms.length || (pinned.length && !isArabic(rest) && !englishWords(foldEnglish(rest)).some(w => !STOP.has(w)))) return { pinned, hits: [], allMatched: true, corrections: {} };
            const hits = this.rank(query, null, limit + pinned.length).filter(r => !pinned.includes(this.refs.get(r.doc).urn)).slice(0, limit).map(r => ({ urn: this.refs.get(r.doc).urn, score: r.score, matched: query.terms.filter((t, i) => r.mask & (1 << i)).map(t => t.word), missed: query.terms.filter((t, i) => !(r.mask & (1 << i))).map(t => t.word) }));
            return { pinned, hits, allMatched: !hits.length || hits.some(h => !h.missed.length), corrections: query.corrections };
        }
        advanced(request, limit = 50) {
            const conditions = [], lexical = [], corrections = {}; let remembered;
            for (const label of unique(request.labels || [])) conditions.push(['label:' + label, doc => this.labels.get(label)?.has(doc) ? 1 : 0]);
            if (request.collections?.length) conditions.push(['collection', doc => request.collections.includes(this.refs.get(doc).collection) ? 1 : 0]);
            if (request.grades?.length) conditions.push(['grade', doc => request.grades.includes(this.refs.get(doc).cat || 'other') ? 1 : 0]);
            for (const name of ['name', 'words']) {
                if (!request[name]?.trim()) continue;
                const q = this.query(request[name]); if (!q.terms.length) continue;
                Object.assign(corrections, q.corrections); lexical.push(q); if (name === 'words') remembered = q;
                const cov = this.coverage(q); conditions.push([name, doc => cov.share[doc]]);
            }
            if (!conditions.length) return { pinned: [], hits: [], allMatched: true, corrections };
            const scores = new Float64Array(this.size + 1); for (const doc of this.refs.keys()) scores[doc] = conditions.reduce((s, [, f]) => s + f(doc), 0) / conditions.length;
            const query = { terms: lexical.flatMap(q => q.terms).slice(0, 12), phrases: lexical.flatMap(q => q.phrases), table: lexical[0]?.table || 'en', words: remembered?.table === 'en' ? remembered.words : [], scattered: true };
            const ranked = query.terms.length ? this.rank(query, scores, limit) : [...this.refs.keys()].filter(d => scores[d] > 0).sort((a, b) => scores[b] - scores[a] || this.prior(b) - this.prior(a) || a - b).slice(0, limit).map(doc => ({ doc, score: scores[doc] }));
            const hits = ranked.map(r => ({ urn: this.refs.get(r.doc).urn, score: r.score, matched: conditions.filter(([, f]) => f(r.doc) >= 1).map(([n]) => n), missed: conditions.filter(([, f]) => f(r.doc) < 1).map(([n]) => n) }));
            return { pinned: [], hits, allMatched: !hits.length || !hits[0].missed.length, corrections };
        }
        suggestTopics(text, limit = 6) {
            // Android topic suggestions use English enrichment; Arabic still searches the narration index.
            const query = this.query(foldEnglish(text)); if (!query.terms.length) return [];
            const evidence = new Map(); this.rank(query, null, 40).forEach((r, p) => { for (const label of this.names.keys()) if (this.labels.get(label)?.has(r.doc)) evidence.set(label, (evidence.get(label) || 0) + 1 / (p + 3)); });
            const strongest = Math.max(0, ...evidence.values());
            const same = (a, b) => { if (a === b) return true; const [short, long] = a.length <= b.length ? [a, b] : [b, a], stem = short.replace(/e+$/, ''); return short.length >= 3 && long.startsWith(stem) && ['s', 'es', 'e', 'ed', 'd', 'ing', 'er', 'ers', 'ness'].includes(long.slice(stem.length)); };
            return [...this.names].map(([id, name]) => { const words = englishWords(foldEnglish(name)); return { id, score: query.terms.filter(t => t.alts.some(a => words.some(w => same(w, a.text)))).length / query.terms.length + (strongest ? (evidence.get(id) || 0) / strongest : 0) }; }).filter(s => s.score >= .3).sort((a, b) => b.score - a.score).slice(0, limit);
        }
        categoryMatches(text) {
            const words = (text.toLowerCase().match(/[\p{L}\p{N}']+/gu) || []).filter(w => w.length > 2);
            return words.length ? this.categories.filter(c => words.every(w => c.title.toLowerCase().includes(w))).map(c => ({ id: c.id, score: 3 })) : [];
        }
        describe(request) {
            const filtered = request.name?.trim() || request.collections?.length || request.grades?.length;
            const result = filtered ? this.advanced(request) : this.search(request.words);
            if (filtered) { result.hits = result.hits.filter(h => !h.missed.includes('collection') && !h.missed.includes('grade')); result.allMatched = !result.hits.length || result.hits.some(h => !h.missed.length); }
            return result;
        }
    }
    const api = { SearchEngine, foldEnglish, foldArabic, englishWords, contentWords, editDistance, parseReference };
    if (typeof module !== 'undefined') module.exports = api;
    root.HadithSearch = api;
})(globalThis);
