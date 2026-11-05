/* ==========================================================
   script.js — fetching, rendering, theme, sheets, menus, export
   ========================================================== */

// Narrations use the same shipped Sunnah.com dataset as the Android app, at data/v2/.
// Quality filtering — empty English, bare
// cross-references, and so on — already happened when that dataset was
// built, so there is nothing to reject at draw time any more.
const DATA_BASE = 'data/v2';
const SHARD_SIZE = 250;

function readPreference(key) { try { return localStorage.getItem(key); } catch { return null; } }
function writePreference(key, value) { try { if (value == null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* Preferences are optional; keep reading. */ } }

let datasetIndex = null;
let datasetIndexPromise = null;
let gradeCodesPromise = null;
let legacyPromise = null;
const shardCache = new Map(); // "collection/shard" -> array of records

/* ==========================================================
   DOM
   ========================================================== */

const $ = id => document.getElementById(id);

const btn = $('generate-btn');
const generateLabel = $('generate-label');
const dock = $('dock');
const contentDiv = $('hadith-content');
const arabicDiv = $('arabic-text');
const arabicBlock = $('arabic-block');
const narratorEl = $('narrator');

const briefMain = $('brief-main');
const briefSub = $('brief-sub');
const briefStatus = $('brief-status');
const briefStatusLabel = $('brief-status-label');

const metadataDiv = $('metadata');
const refBook = $('ref-book');
const refNumber = $('ref-number');
const refChapter = $('ref-chapter');
const refChapterItem = $('ref-chapter-item');
const refGrades = $('ref-grades');
const refGradesList = $('ref-grades-list');
const sunnahLinkBrief = $('sunnah-link-brief');
const statusEl = $('status');

const copyBtn = $('copy-btn');
const copyLabel = $('copy-label');
const saveBtn = $('save-btn');
const cardBtn = $('card-btn');
const expandBtn = $('expand-btn');
const expandLabel = $('expand-label');
const hadithCard = $('hadith-card');
const quoteArt = $('quote-art');
const narration = $('narration');

const themeBtn = $('theme-btn');
const languageBtn = $('language-btn');
const starsContainer = $('stars');

const modal = $('card-modal');
const previewImg = $('card-preview');
const previewFrame = $('preview-frame');
const downloadBtn = $('download-btn');
const shareBtn = $('share-btn');
const copyImageBtn = $('copy-image-btn');
const shareWhatsapp = $('share-whatsapp');
const shareFacebook = $('share-facebook');
const shareInstagram = $('share-instagram');
const cardArabicBtn = $('card-arabic-btn');
const toastEl = $('toast');

let current = null;          // the hadith currently on screen
let currentPosition = null;  // its position in the collection, for excluding the next draw
let cardHadith = null;       // the hadith the share sheet is composing
let cardTheme = 'light';
let cardArabic = true;       // include the Arabic on the exported card
let cardCanvas = null;
let previewUrl = null;
let isFetching = false;
let readRequest = 0;
let isExpanded = false;
let englishAnimation = null;
let arabicAnimation = null;
let referenceAnimation = null;
let hasLoadedOnce = false;

/* ==========================================================
   Boot
   ========================================================== */

function initReader() {
    generateStars();
    initTheme();
    initHeader();
    initSheets();
    initReadingLanguage();
    initTextSize();
    initShortcuts();
    initCardUI();
    initClamp();
    initGradeFilter();
    initDock();

    if (btn) btn.addEventListener('click', () => {
        const params = new URLSearchParams(location.search);
        !current && params.has('h') ? openShared(params.get('h')) : draw();
    });
    if (copyBtn) copyBtn.addEventListener('click', copyText);
    const shortcutsBtn = $('shortcuts-btn');
    if (shortcutsBtn) {
        shortcutsBtn.addEventListener('click', () => openSheet($('shortcuts-modal'), shortcutsBtn));
        shortcutsBtn.disabled = false;
    }

    // Land on a narration rather than an empty card -- the shared one, for a
    // hadithpull.online/h/ link opened away from the app (?h=urn:<id>).
    if (btn && contentDiv) {
        const params = new URLSearchParams(location.search);
        params.has('h') ? openShared(params.get('h')) : draw();
    }
}

/* ==========================================================
   Fetching
   ========================================================== */

async function loadIndex() {
    if (datasetIndex) return datasetIndex;

    if (!datasetIndexPromise) {
        datasetIndexPromise = fetch(`${DATA_BASE}/index.json`).then(response => {
            if (!response.ok) throw new Error('index fetch failed');
            return response.json();
        }).catch(error => {
            datasetIndexPromise = null;
            throw error;
        });
    }

    datasetIndex = await datasetIndexPromise;
    return datasetIndex;
}

async function loadShard(collection, shard) {
    const cacheKey = collection + '/' + shard;
    const corpus = shardCache.has(cacheKey) ? Promise.resolve(shardCache.get(cacheKey))
        : fetch(`${DATA_BASE}/${collection}/${shard}.json`).then(response => {
            if (!response.ok) throw new Error('shard fetch failed'); return response.json();
        });
    const [records, metadata] = await Promise.all([corpus, loadArabicMetadata(collection)]);
    for (const record of records) {
        const fields = metadata.records?.[record.urn];
        record.chapterArabic = metadata.strings?.[fields?.[0]] || '';
        record.narratorArabic = metadata.strings?.[fields?.[1]] || '';
    }
    shardCache.set(cacheKey, records);
    return records;
}

const arabicMetadata = new Map();
function loadArabicMetadata(collection) {
    if (!arabicMetadata.has(collection)) arabicMetadata.set(collection, fetch(`data/arabic-metadata/${collection}.json`).then(response => {
        if (!response.ok) throw Error('Arabic reference metadata unavailable'); return response.json();
    }).catch(() => { arabicMetadata.delete(collection); return {}; }));
    return arabicMetadata.get(collection);
}

function loadLegacy() {
    if (!legacyPromise) {
        legacyPromise = fetch(`${DATA_BASE}/legacy.json`).then(response => {
            if (!response.ok) throw new Error('legacy map fetch failed');
            return response.json();
        }).catch(error => {
            legacyPromise = null;
            throw error;
        });
    }
    return legacyPromise;
}

/** One character per record, in dataset order (tools/build-grades.mjs): s, o or n. */
function loadGradeCodes() {
    if (!gradeCodesPromise) {
        gradeCodesPromise = fetch(`${DATA_BASE}/grades.json`).then(response => {
            if (!response.ok) throw new Error('grades fetch failed');
            return response.json();
        });
        // A failed fetch should be retried on the next draw, not cached forever.
        gradeCodesPromise.catch(() => { gradeCodesPromise = null; });
    }
    return gradeCodesPromise;
}

/* "Draw from": which grades the next narration is drawn from. */
const GRADE_FILTERS = [
    { key: 'all',    label: 'All grades',    code: null, dot: 'unknown' },
    { key: 'sahih',  label: 'Sahih only',    code: 's',  dot: 'sahih' },
    { key: 'other',  label: "Hasan & Da'if", code: 'o',  dot: 'daif' },
    { key: 'none',   label: 'No grade',      code: 'n',  dot: 'none' }
];

function gradeFilter() {
    const saved = readPreference('gradeFilter');
    return GRADE_FILTERS.find(f => f.key === saved) || GRADE_FILTERS[1];
}

/**
 * Uniform over every eligible hadith, not over collections — otherwise the
 * three forty-hadith books would each be as likely to come up as Bukhari.
 * With a grade filter, uniform over the narrations of that grade.
 */
async function pickRecord() {
    if (typeof Topics !== 'undefined' && Parity.Local.get('readFrom')) {
        const model = await Topics.load();
        const id = Parity.Local.get('readFrom'), bookmarks = typeof BookmarkStore !== 'undefined' && BookmarkStore.readingSource(id);
        const source = model.saved(id);
        if (source || bookmarks) {
            const legacy = bookmarks?.keys.some(key => !key.startsWith('urn:')) ? await loadLegacy() : {};
            const selected = bookmarks ? bookmarks.keys.map(key => key.startsWith('urn:') ? key.slice(4) : legacy[key]).filter(Boolean) : model.urns(source);
            const pools = await loadReadingPools();
            const urns = Parity.sourceCandidates(selected, pools.grades, gradeFilter().code, current?.key);
            if (urns.length) {
                const found = await findRecord('urn:' + urns[Math.floor(Math.random() * urns.length)]);
                if (found) return found;
            }
            if (bookmarks) throw Object.assign(Error('Empty bookmarks'), { userMessage: 'No saved narrations are available here. Choose another reading source or save a narration first.' });
        }
    }
    const index = await loadIndex();
    const filter = gradeFilter();
    const codes = { ...await loadGradeCodes() };
    if (current && currentPosition != null) {
        const text = codes[current.collection];
        codes[current.collection] = text.slice(0, currentPosition) + '-' + text.slice(currentPosition + 1);
    }
    const counts = index.collections.map(c => countOf(codes[c.id], filter.code));
    const code = counts.some(n => n > 0) ? filter.code : null;
    const sizes = counts.some(n => n > 0) ? counts : index.collections.map(c => countOf(codes[c.id], null));
    const total = sizes.reduce((sum, n) => sum + n, 0);

    let offset = Math.floor(Math.random() * total);
    let ci = 0;
    while (offset >= sizes[ci]) { offset -= sizes[ci]; ci++; }

    const collection = index.collections[ci];
    const position = nthIndexOf(codes[collection.id], code, offset);

    const records = await loadShard(collection.id, collection.shards[Math.floor(position / SHARD_SIZE)].k);
    return { collection, record: records[position % SHARD_SIZE], position };
}

function countOf(text, ch) {
    let n = 0;
    for (let i = 0; i < text.length; i++) if (ch ? text[i] === ch : text[i] !== '-') n++;
    return n;
}

function nthIndexOf(text, ch, n) {
    for (let i = 0; i < text.length; i++) {
        if ((ch ? text[i] === ch : text[i] !== '-') && n-- === 0) return i;
    }
    return -1;
}

// One eased turn of the draw arrow; a draw never resolves faster than this.
const MIN_DRAW_MS = 600;

async function draw() {
    if (!btn || !contentDiv || isFetching) return;
    const request = ++readRequest;
    isFetching = true;
    setLoading(true);
    const started = performance.now();

    try {
        const { collection, record, position } = await pickRecord();

        const wait = MIN_DRAW_MS - (performance.now() - started);
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
        if (request !== readRequest) return;
        isFetching = false;
        displayHadith(record, collection, position);
    } catch (error) {
        if (request !== readRequest) return;
        console.error(error);
        isFetching = false;
        showError(error.userMessage);
    }
}

/** An unresolved share must never be replaced with an unrelated narration. */
async function openShared(key) {
    const request = ++readRequest;
    isFetching = true;
    setLoading(true);

    try {
        const found = await findRecord(key);
        if (request !== readRequest) return;
        isFetching = false;
        if (found) {
            displayHadith(found.record, found.collection, found.position);
        } else {
            showError("This shared Hadith isn't available in the current collection. Please check the link.");
            if (generateLabel) generateLabel.textContent = readingLabel('newHadith');
            rememberReadKey(null);
        }
    } catch (error) {
        if (request !== readRequest) return;
        console.error(error);
        isFetching = false;
        showError("Couldn't load this shared Hadith. Please try again.");
    }
}

/** URNs are identities; old collection:ref links use the app's audited legacy map. */
async function findRecord(key) {
    if (typeof key !== 'string' || !/^[a-z0-9]+:[^\s]+$/i.test(key)) return null;
    const urn = key.startsWith('urn:') ? key.slice(4) : (await loadLegacy())[key];
    if (!/^\d{1,9}$/.test(urn)) return null;
    const index = await loadIndex();
    const wanted = Number(urn);
    const collection = index.collections.find(c => wanted >= Number(c.urnMin) && wanted <= Number(c.urnMax));
    if (!collection) return null;
    const shard = collection.shards.slice().reverse().find(s => Number(s.firstUrn) <= wanted);
    if (!shard) return null;
    const records = await loadShard(collection.id, shard.k);
    const offset = records.findIndex(r => r.urn === urn);
    return offset >= 0 ? { collection, record: records[offset], position: shard.k * SHARD_SIZE + offset } : null;
}

/** The narration as the rest of the site handles it: the shape bookmarks and the card use. */
function toHadith(record, collection) {
    return {
        collection: collection.id,
        collectionTitle: collection.title,
        ref: record.ref,
        book: record.book,
        inBook: record.inBook,
        chapter: record.chapter || '',
        chapterArabic: record.chapterArabic || '',
        english: record.english,
        arabic: record.arabic || '',
        narrator: record.narrator || '',
        narratorArabic: record.narratorArabic || '',
        grades: record.grades || [],
        primary: record.primary || null,
        sunnahUrl: `https://sunnah.com/urn/${record.urn}`,
        key: `urn:${record.urn}`
    };
}

function showError(message) {
    contentDiv.hidden = false;
    contentDiv.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'error-text';
    p.textContent = message || "Couldn't load a narration. Please try again.";
    contentDiv.appendChild(p);

    current = null;
    resetClamp();

    if (narratorEl) narratorEl.hidden = true;
    if (metadataDiv) metadataDiv.hidden = true;
    if (arabicDiv) arabicDiv.textContent = '';
    if (arabicBlock) arabicBlock.hidden = true;
    paintBrief(null);

    setLoading(false, readingLabel('retry'));
}

let skeletonTimer = null;

function setLoading(loading, label) {
    if (!btn) return;
    const recent = $('recent-read');
    if (recent) recent.disabled = loading;

    btn.classList.toggle('is-loading', loading);
    btn.setAttribute('aria-busy', String(loading));
    if (dock) dock.classList.toggle('is-loading', loading);
    if (hadithCard) hadithCard.classList.toggle('is-ready', !loading && Boolean(current));

    if (generateLabel) {
        generateLabel.innerHTML = loading
            ? readingLabel('seeking') + '<span class="seeking-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>'
            : '';
        if (!loading) generateLabel.textContent = label || readingLabel('newHadith');
    }

    clearTimeout(skeletonTimer);

    if (loading) {
        if (copyBtn) copyBtn.disabled = true;
        if (saveBtn) saveBtn.disabled = true;
        if (cardBtn) cardBtn.disabled = true;

        contentDiv.setAttribute('aria-busy', 'true');

        // The current narration lifts away; the skeleton only shows if a draw is slow.
        // Fade the parent so a child's expansion animation cannot override the exit.
        const outgoing = hadithCard || contentDiv;
        outgoing.classList.remove('fade-in');
        outgoing.classList.add('fade-out');

        skeletonTimer = setTimeout(() => {
            outgoing.classList.remove('fade-out');
            resetClamp();
            contentDiv.hidden = false;
            if (arabicDiv) arabicDiv.textContent = '';
            if (narratorEl) narratorEl.hidden = true;
            if (metadataDiv) metadataDiv.hidden = true;
            contentDiv.innerHTML =
                '<div class="skeleton" aria-label="Loading"><span></span><span></span><span></span><span></span></div>';
        }, hasLoadedOnce ? 300 : 0);
    } else {
        (hadithCard || contentDiv).classList.remove('fade-out');
        contentDiv.setAttribute('aria-busy', 'false');
    }
}

/* ==========================================================
   Rendering
   ========================================================== */

function rememberReadKey(key) {
    if (typeof SiteNavigation !== 'undefined') return SiteNavigation.setReadKey(key);
    const url = new URL(location.href);
    if (key) url.searchParams.set('h', key);
    else url.searchParams.delete('h');
    history.replaceState(null, '', url);
}

function displayHadith(record, collection, position) {
    clearTimeout(skeletonTimer);

    current = toHadith(record, collection);
    currentPosition = position;
    rememberReadKey(current.key);
    current.excerpt = buildExcerpt(record.english, PAGE_EXCERPT);
    current.cardExcerpt = buildExcerpt(record.english, CARD_EXCERPT);

    paintReadingLanguage();

    setLoading(false);
    if (copyBtn) copyBtn.disabled = false;
    if (saveBtn) saveBtn.disabled = false;
    if (cardBtn) cardBtn.disabled = false;
    resetCopied();

    animateNarrationIn();

    stopNarrationScroll();
    if (narration) narration.scrollTop = 0;
    if (hasLoadedOnce && window.scrollY > 0) window.scrollTo({ top: 0, behavior: 'smooth' });
    hasLoadedOnce = true;
    recordReadingHistory();

    if (typeof onHadithDisplayed === 'function') onHadithDisplayed(current);
}

function recordReadingHistory() {
    if (!current?.key || isFetching || typeof Parity === 'undefined') return;
    if (typeof SiteNavigation !== 'undefined' && SiteNavigation.isReading && !SiteNavigation.isReading()) return;
    const requested = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('h') : null;
    if (requested && requested !== current.key) return;
    Parity.Local.set('recentRead', Parity.historyAfterDisplay(Parity.Local.get('recentRead', []), current.key));
}

document.addEventListener('screenchange', event => { if (event.detail === 'read') recordReadingHistory(); });

let readingPoolsPromise;
function loadReadingPools() {
    if (!readingPoolsPromise) readingPoolsPromise = fetch('data/reading-pools.json').then(r => {
        if (!r.ok) throw Error('Reading metadata unavailable'); return r.json();
    }).catch(error => { readingPoolsPromise = null; throw error; });
    return readingPoolsPromise;
}

// Restart every visible block together, whether the hadith or its language changed.
function animateNarrationIn() {
    [contentDiv, arabicBlock, narratorEl, expandBtn, quoteArt].forEach(el => {
        if (!el || el.hidden) return;
        el.classList.remove('fade-in');
        void el.offsetWidth;
        el.classList.add('fade-in');
    });
}

function paintReadingLanguage() {
    if (!current) return;
    const language = readingLanguage();
    const arabic = usesArabic(current, language);

    /* English body — the excerpt first, if there is one */
    paintEnglish(false);
    contentDiv.hidden = arabic;
    if (hadithCard) {
        hadithCard.classList.toggle('is-arabic', arabic);
        hadithCard.setAttribute('dir', arabic ? 'rtl' : 'ltr');
    }

    if (arabicDiv) arabicDiv.textContent = current.arabic;

    /* Narrator */
    if (narratorEl) {
        narratorEl.textContent = arabic ? current.narratorArabic || '' : current.narrator;
        narratorEl.hidden = !narratorEl.textContent;
        narratorEl.lang = arabic ? 'ar' : 'en'; narratorEl.dir = arabic ? 'rtl' : 'ltr';
    }

    /* Reference — the dock summary always; the full block once expanded */
    paintBrief(current, language);

    if (refBook) refBook.textContent = language === 'ar' ? arabicCollection(current) : current.collectionTitle;
    if (refNumber) refNumber.textContent = current.ref || readingLabel('notNumbered', language);

    if (refChapter && refChapterItem) {
        refChapter.textContent = referenceChapter(current, language);
        refChapterItem.hidden = !refChapter.textContent;
    }

    renderGrades(language);
    paintStatus(statusEl, current.primary, language);
    applyClamp();
}

/** The dock's reference summary: collection, number, grade pill, chapter, Sunnah link. */
function paintBrief(hadith, language = 'en') {
    const referenceCard = $('ref-brief');
    if (referenceCard) referenceCard.dir = language === 'ar' ? 'rtl' : 'ltr';
    if (briefMain) {
        briefMain.textContent = hadith ? (language === 'ar' ? arabicCollection(hadith) : hadith.collectionTitle) : '';
        const ref = hadith && (language === 'ar' ? arabicNumber(hadith) : hadith.ref && `Hadith ${hadith.ref}`);
        if (ref) {
            const separator = document.createElement('span');
            separator.className = 'brief-separator';
            separator.textContent = ' · ';
            const number = document.createElement('span');
            number.className = 'brief-number';
            number.textContent = ref;
            briefMain.append(separator, number);
        }
    }
    if (briefSub) {
        briefSub.textContent = hadith ? referenceChapter(hadith, language) : '';
        briefSub.lang = language; briefSub.dir = language === 'ar' ? 'rtl' : 'ltr';
    }

    if (briefStatus) {
        briefStatus.hidden = !hadith;
        if (hadith) {
            briefStatus.className = 'status has-menu ' + gradeClass(hadith.primary);
            briefStatusLabel.textContent = language === 'ar' ? arabicGrade(hadith.primary) : gradeLabel(hadith.primary);
        }
    }

    if (sunnahLinkBrief) {
        sunnahLinkBrief.hidden = !(hadith && hadith.sunnahUrl);
        if (hadith && hadith.sunnahUrl) sunnahLinkBrief.href = hadith.sunnahUrl;
    }
}

function referenceLabel(h) {
    return h.ref ? `${h.collectionTitle} · Hadith ${h.ref}` : h.collectionTitle;
}

/** A plain grade pill; "No grade" when the narration has none. */
function paintStatus(el, primary, language = 'en') {
    if (!el) return;
    el.hidden = false;
    el.textContent = language === 'ar' ? arabicGrade(primary) : gradeLabel(primary);
    el.className = 'status ' + gradeClass(primary);
}

function gradeLabel(primary) {
    return primary ? primary.grade : 'No grade';
}

function gradeClass(primary) {
    if (!primary) return 'status-none';
    return 'status-' + (['sahih', 'hasan', 'daif'].includes(primary.cat) ? primary.cat : 'unknown');
}

/** The GRADES lines, in data order: scholar: grade. Empty when there are none. */
function gradeLines(h) {
    if (!h.primary) return [];
    if (h.primary.consensus) return ['Accepted as sahih by scholarly consensus'];
    if (h.grades && h.grades.length) return h.grades.map(g => g.by ? `${g.by}: ${g.grade}` : g.grade);
    return [h.primary.by ? `${h.primary.by}: ${h.primary.grade}` : h.primary.grade];
}

/**
 * Long narrations arrive as one unbroken block, which is punishing to read.
 * Group them into paragraphs of a few sentences each — purely visual: not a
 * word is added, removed or reordered, and the result is checked against the
 * original before being used.
 */
function paragraphize(text) {
    const existing = text.split(/\n+/).map(s => s.trim()).filter(Boolean);

    if (existing.length > 1 || text.length < 600) return existing;

    const sentences = text.match(/[^.!?]+[.!?]+["'”’)\]]*\s*/g);
    if (!sentences || sentences.length < 4) return existing;

    // A trailing clause with no end punctuation is not captured by the match.
    const consumed = sentences.join('');
    if (!text.startsWith(consumed)) return existing;

    const remainder = text.slice(consumed.length).trim();
    if (remainder) sentences.push(remainder);

    // Group by length rather than sentence count, so a run of terse sentences
    // does not turn into a stack of one-line paragraphs.
    const TARGET = 300;
    const paragraphs = [];
    let buffer = '';

    sentences.forEach(sentence => {
        buffer += sentence;

        if (buffer.length >= TARGET) {
            paragraphs.push(buffer.trim());
            buffer = '';
        }
    });

    if (buffer.trim()) {
        // Don't leave a stub paragraph behind.
        if (buffer.trim().length < 120 && paragraphs.length) {
            paragraphs[paragraphs.length - 1] += ' ' + buffer.trim();
        } else {
            paragraphs.push(buffer.trim());
        }
    }

    if (paragraphs.length < 2) return existing;

    // Anything the regex dropped (a trailing clause without end punctuation,
    // say) means the split is not lossless — fall back to the original.
    const squash = s => s.replace(/\s+/g, '');
    if (squash(paragraphs.join(' ')) !== squash(text)) return existing;

    return paragraphs;
}

/** Renders the GRADES list in the full reference block. */
function renderGrades(language = 'en') {
    if (!refGrades || !refGradesList) return;

    refGradesList.innerHTML = '';
    const lines = language === 'ar' && current
        ? (current.grades.length ? current.grades : [current.primary]).filter(Boolean)
            .map(g => g.by ? `${g.by}: ${arabicGrade(g)}` : arabicGrade(g))
        : current ? gradeLines(current) : [];

    lines.forEach(line => {
        const li = document.createElement('li');
        li.textContent = line;
        li.dir = 'auto';
        refGradesList.appendChild(li);
    });

    refGrades.hidden = !lines.length;
}

/* ==========================================================
   Long narrations — collapsed to an excerpt, expandable
   ==========================================================
   The full text already arrives with the record, so expanding
   is instant: this only controls how much of it is on screen.
   ========================================================== */

// Unhurried, so the page visibly opens rather than snapping.
const ANIM_MS = 750;

/**
 * Excerpts are cut at a sentence end, so what you read is always whole.
 *
 * `whole`       — at or under this, the narration is shown in full and there is
 *                 nothing to expand. Five or six sentences fit here.
 * `min` / `cap` — when an excerpt is needed, it grows to at least `min` and a
 *                 runaway sentence is cut at `cap`. Enough to be worth reading,
 *                 short enough not to be a wall.
 * `worthHiding` — if less than this would be revealed, don't hide anything.
 */
const PAGE_EXCERPT = { whole: 900, min: 480, cap: 760, worthHiding: 200 };

// The card has a square to fill at a size readable at arm's length, so it
// carries less than the page does.
const CARD_EXCERPT = { whole: 420, min: 240, cap: 400, worthHiding: 100 };

/**
 * Returns a short, complete opening for a long narration, or null when the
 * text is already short enough to show in full.
 */
function buildExcerpt(text, budget) {
    if (text.length <= budget.whole) return null;

    const sentences = text.match(/[^.!?]+[.!?]+["'”’)\]]*\s*/g);
    let excerpt = '';

    if (sentences) {
        for (const sentence of sentences) {
            excerpt += sentence;
            if (excerpt.length >= budget.min) break;
        }
        excerpt = excerpt.trim();
    }

    // A single runaway sentence is no better than the whole thing — fall back
    // to a word-boundary cut, the only place an ellipsis is warranted.
    if (!excerpt || excerpt.length > budget.cap) {
        excerpt = text.slice(0, budget.cap);
        excerpt = excerpt.slice(0, excerpt.lastIndexOf(' ')).replace(/[\s,;:]+$/, '') + '…';
    }

    // Only worth hiding anything if there is really something behind it.
    // Otherwise "Show full Hadith" opens onto a couple of extra words.
    const saved = text.length - excerpt.length;

    if (saved < budget.worthHiding || excerpt.length > text.length * 0.8) return null;

    return excerpt;
}

/** Arabic that is only a fragment of chain is not something to reveal. */
function hasArabicWorthShowing(arabic) {
    const clean = (arabic || '').trim();
    return clean.length >= 12 && clean.split(/\s+/).length >= 3;
}

function paintEnglish(expanded) {
    if (!contentDiv || !current) return;

    const parts = expanded || !current.excerpt
        ? paragraphize(current.english)
        : [current.excerpt];

    contentDiv.innerHTML = '';

    parts.forEach(part => {
        const p = document.createElement('p');
        p.textContent = part;
        contentDiv.appendChild(p);
    });
}

function resetClamp() {
    if (englishAnimation) englishAnimation.cancel();
    if (arabicAnimation) arabicAnimation.cancel();
    if (referenceAnimation) referenceAnimation.cancel();
    englishAnimation = arabicAnimation = referenceAnimation = null;
    if (contentDiv) contentDiv.style.maxHeight = '';

    if (arabicBlock) {
        arabicBlock.hidden = true;
        arabicBlock.style.maxHeight = '';
    }

    isExpanded = false;

    if (hadithCard) hadithCard.classList.remove('is-expanded');

    if (expandBtn) {
        expandBtn.hidden = true;
        expandBtn.setAttribute('aria-expanded', 'false');
    }

    if (metadataDiv) metadataDiv.hidden = true;
}

function applyClamp() {
    if (!expandBtn || !current) return;

    resetClamp();

    if (usesArabic(current, readingLanguage())) {
        if (arabicBlock) arabicBlock.hidden = false;
        return;
    }

    // There is always more to show if the Arabic exists, even when the
    // translation fits in full.
    expandBtn.hidden = !current.excerpt && !hasArabicWorthShowing(current.arabic);

    updateExpandLabel();
}

function updateExpandLabel() {
    if (!expandLabel) return;

    if (isExpanded) {
        expandLabel.textContent = 'Show less';
        return;
    }

    const hasMoreText = Boolean(current && current.excerpt);
    expandLabel.textContent = hasMoreText ? 'Show Full Hadith and reference' : 'Show Arabic and reference';
}

function toggleExpand() {
    if (usesArabic(current, readingLanguage())) return;
    stopNarrationScroll();
    isExpanded = !isExpanded;
    expandBtn.setAttribute('aria-expanded', String(isExpanded));
    const motion = {
        duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : ANIM_MS,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
    };

    if (hadithCard) hadithCard.classList.toggle('is-expanded', isExpanded);

    /* Swap the excerpt for the full text (or back), growing to fit */
    if (current && current.excerpt) {
        const from = contentDiv.getBoundingClientRect().height;

        if (englishAnimation) englishAnimation.cancel();
        paintEnglish(isExpanded);
        const to = contentDiv.scrollHeight;
        englishAnimation = contentDiv.animate([{ height: from + 'px' }, { height: to + 'px' }], motion);
    }

    /* The Arabic, which sits above the translation */
    const showArabic = Boolean(current && hasArabicWorthShowing(current.arabic));
    if (arabicBlock && showArabic) {
        const style = getComputedStyle(arabicBlock);
        const from = {
            height: arabicBlock.getBoundingClientRect().height + 'px',
            marginBottom: arabicBlock.hidden ? '0px' : style.marginBottom,
            paddingBottom: arabicBlock.hidden ? '0px' : style.paddingBottom,
            borderBottomWidth: arabicBlock.hidden ? '0px' : style.borderBottomWidth
        };
        if (arabicAnimation) arabicAnimation.cancel();
        arabicBlock.hidden = false;
        const full = getComputedStyle(arabicBlock);
        const to = isExpanded ? {
            height: arabicBlock.getBoundingClientRect().height + 'px',
            marginBottom: full.marginBottom, paddingBottom: full.paddingBottom, borderBottomWidth: full.borderBottomWidth
        } : { height: '0px', marginBottom: '0px', paddingBottom: '0px', borderBottomWidth: '0px' };
        const animation = arabicAnimation = arabicBlock.animate([from, to], { ...motion, fill: 'both' });
        animation.onfinish = () => {
            if (arabicAnimation !== animation) return;
            arabicBlock.hidden = !isExpanded;
            arabicAnimation = null;
            animation.cancel();
        };
    }

    if (metadataDiv) {
        const style = getComputedStyle(metadataDiv);
        const from = {
            opacity: metadataDiv.hidden ? '0' : style.opacity,
            transform: metadataDiv.hidden ? 'translateY(28px)' : style.transform
        };
        if (referenceAnimation) referenceAnimation.cancel();
        metadataDiv.hidden = false;
        const animation = referenceAnimation = metadataDiv.animate([from, {
            opacity: isExpanded ? '1' : '0',
            transform: isExpanded ? 'none' : 'translateY(-16px)'
        }], { ...motion, fill: 'both' });
        animation.onfinish = () => {
            if (referenceAnimation !== animation) return;
            metadataDiv.hidden = !isExpanded;
            referenceAnimation = null;
            animation.cancel();
        };
    }

    updateExpandLabel();

    // Return to the start of the narration so the Arabic, when shown, opens in view.
    if (narration && narration.scrollTop > 0) scrollNarrationTo(0);
    if (hadithCard && hadithCard.getBoundingClientRect().top < 0) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function initClamp() {
    if (!expandBtn) return;

    expandBtn.addEventListener('click', toggleExpand);

    // Web fonts change the measured height, so re-measure once they land.
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => { if (current && !isExpanded) applyClamp(); });
    }
}

/* ==========================================================
   Dock — measure its height to keep mobile toasts above the controls.
   ========================================================== */

function initDock() {
    if (!dock || typeof ResizeObserver === 'undefined') return;

    new ResizeObserver(() => {
        document.documentElement.style.setProperty('--dock-h', dock.offsetHeight + 'px');
    }).observe(dock);
}

/* ==========================================================
   Grade filter — the pill in the dock opens "Draw from"
   ========================================================== */

function initGradeFilter() {
    if (!briefStatus) return;

    briefStatus.addEventListener('click', () => {
        const selected = gradeFilter().key;
        openMenu(briefStatus, {
            title: readingLabel('drawFrom'),
            above: true,
            items: GRADE_FILTERS.map(f => ({
                label: readingLanguage() === 'ar' ? f.key === 'all' ? 'جميع الدرجات' : f.key === 'none' ? 'بدون حكم' : f.key === 'sahih' ? 'الصحيح فقط' : 'الحسن والضعيف' : f.label,
                dot: f.dot,
                checked: f.key === selected,
                onSelect: () => {
                    writePreference('gradeFilter', f.key);
                    if (f.key !== selected) {
                        toast(f.key === 'all' ? 'Drawing from all grades' : 'Drawing from: ' + f.label);
                        draw();
                    }
                }
            }))
        });
    });
}

/* ==========================================================
   Saved text size — retained after removing the appearance control
   ========================================================== */

const TEXT_SIZES = [
    { key: 'comfortable', scale: 1,    label: 'Comfortable' },
    { key: 'large',       scale: 1.12, label: 'Large' },
    { key: 'largest',     scale: 1.26, label: 'Largest' }
];

function setTextSize(key) {
    const size = TEXT_SIZES.find(s => s.key === key) || TEXT_SIZES[0];

    document.documentElement.style.setProperty('--reading-scale', String(size.scale));
    if (current && !isExpanded) requestAnimationFrame(applyClamp);
}

function initTextSize() {
    setTextSize(readPreference('textSize'));
}

/* ==========================================================
   Copy the text
   ========================================================== */

function plainText(h, language = 'en') {
    if (usesArabic(h, language)) {
        const lines = [h.arabic.trim(), '', `${arabicReference(h, '، ')} (${arabicGrade(h.primary)})`];
        if (h.chapterArabic) lines.push(`الباب: ${h.chapterArabic}`);
        if (h.sunnahUrl) lines.push(`Sunnah.com: ${h.sunnahUrl}`);
        if (h.key) lines.push(`اقرأ في Hadith Pull: ${hadithLink(h.key)}`);
        return lines.join('\n');
    }
    const grade = h.primary ? h.primary.grade : '';

    const lines = [h.english];
    if (h.narrator) lines.push(h.narrator);
    if ((h.arabic || '').trim()) lines.push('', h.arabic.trim());

    lines.push('');
    lines.push(`${h.collectionTitle}, Hadith ${h.ref}${grade ? ' (' + grade + ')' : ''}`);
    if (h.chapter) lines.push(`Chapter: ${h.chapter}`);
    if (h.sunnahUrl) lines.push(`Sunnah.com: ${h.sunnahUrl}`);
    if (h.key) lines.push(`Read in Hadith Pull: ${hadithLink(h.key)}`);

    return lines.join('\n');
}

let copiedTimer = null;

/** Copy confirms on the button itself: "Copied" with a check, for two seconds. */
async function copyText() {
    if (!current) return;
    if (await copyHadith(current, false, readingLanguage())) {
        copyBtn.classList.add('is-copied');
        if (copyLabel) copyLabel.textContent = readingLabel('copied');
        clearTimeout(copiedTimer);
        copiedTimer = setTimeout(resetCopied, 2000);
    }
}

function resetCopied() {
    if (!copyBtn) return;
    copyBtn.classList.remove('is-copied');
    if (copyLabel) copyLabel.textContent = readingLabel('copy');
}

/** Copies a narration with its reference; toasts the outcome unless `quiet`. */
async function copyHadith(h, announce = true, language = 'en') {
    try {
        await navigator.clipboard.writeText(plainText(h, language));
        if (announce) toast('Hadith copied');
        return true;
    } catch (e) {
        toast('Copying is blocked by your browser');
        return false;
    }
}

/* ==========================================================
   Card export
   ========================================================== */

const SITE_NAME = 'hadithpull.online';
const SITE_URL = 'https://hadithpull.online';

function initCardUI() {
    if (!modal || typeof HadithCard === 'undefined') return;

    if (cardBtn) cardBtn.addEventListener('click', () => openCard(current, readingLanguage()));

    document.querySelectorAll('[data-card-theme]').forEach(button => {
        button.addEventListener('click', () => {
            cardTheme = button.dataset.cardTheme;

            document.querySelectorAll('[data-card-theme]').forEach(b => {
                b.setAttribute('aria-pressed', String(b === button));
            });

            buildCard();
        });
    });

    if (cardArabicBtn) {
        cardArabic = readPreference('cardArabic') !== 'false';
        cardArabicBtn.setAttribute('aria-pressed', String(cardArabic));

        cardArabicBtn.addEventListener('click', () => {
            cardArabic = !cardArabic;
            cardArabicBtn.setAttribute('aria-pressed', String(cardArabic));
            writePreference('cardArabic', String(cardArabic));
            buildCard();
        });
    }

    if (downloadBtn) downloadBtn.addEventListener('click', downloadCard);
    if (copyImageBtn) copyImageBtn.addEventListener('click', copyCardImage);

    // Only offer the native sheet where it can actually carry the image —
    // that is the path that reaches WhatsApp, Instagram and the rest properly.
    if (shareBtn && navigator.canShare && navigator.share) {
        shareBtn.hidden = false;
        shareBtn.addEventListener('click', shareCard);
    }

    if (shareInstagram) {
        shareInstagram.addEventListener('click', async () => {
            await downloadCard();
            toast('Image saved — post it from your gallery in Instagram');
        });
    }
}

/**
 * WhatsApp and Facebook have no web endpoint that accepts an image, so these
 * send the narration and a link. The image itself goes through the native
 * share sheet, or is saved and attached by hand.
 */
function shareText(h, language = 'en') {
    if (usesArabic(h, language)) {
        const lines = [h.arabic.trim(), '', arabicReference(h, '، ')];
        if (h.sunnahUrl) lines.push(`Sunnah.com: ${h.sunnahUrl}`);
        if (h.key) lines.push(`اقرأ في Hadith Pull: ${hadithLink(h.key)}`);
        return lines.join('\n');
    }
    const ref = `${h.collectionTitle}, Hadith ${h.ref}`;
    const sunnah = h.sunnahUrl ? `\nSunnah.com: ${h.sunnahUrl}` : '';
    const body = buildExcerpt(h.english, PAGE_EXCERPT) || h.english;
    const link = h.key ? `\nRead in Hadith Pull: ${hadithLink(h.key)}` : '';
    return `"${body}"\n\n— ${ref}${sunnah}${link}`;
}

/** Opens this Hadith in the Android app when installed, else the Play Store (Android) or this site. */
function hadithLink(key) {
    return `${SITE_URL}/h/?k=${encodeURIComponent(key).replace(/%3A/g, ':')}`;
}

/** Opens the share sheet for any narration: the one on screen, or a saved one. */
function openCard(h, language = 'en') {
    if (!h || !modal) return;
    cardHadith = h;

    // Only offer the Arabic switch when there is Arabic to include.
    if (cardArabicBtn) cardArabicBtn.hidden = !h.arabic;

    if (shareWhatsapp) shareWhatsapp.href = 'https://wa.me/?text=' + encodeURIComponent(shareText(h, language));
    if (shareFacebook) {
        shareFacebook.href = 'https://www.facebook.com/sharer/sharer.php?u=' +
            encodeURIComponent(h.key ? hadithLink(h.key) : SITE_URL);
    }

    openSheet(modal, document.activeElement);
    buildCard();
}

async function buildCard() {
    const h = cardHadith;
    if (!h) return;

    previewFrame.classList.add('is-busy');

    try {
        // A 200-word narration set small enough to fit is not readable at
        // arm's length. The card carries the excerpt and says so.
        const cardExcerpt = buildExcerpt(h.english, CARD_EXCERPT);
        cardCanvas = await HadithCard.render({
            ...h,
            english: cardExcerpt || h.english,
            excerpt: Boolean(cardExcerpt),
            arabic: cardArabic ? h.arabic : '',
            site: SITE_NAME
        }, cardTheme);

        const blob = await canvasToBlob(cardCanvas);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = URL.createObjectURL(blob);
        previewImg.src = previewUrl;
    } catch (e) {
        console.error(e);
        toast('Could not compose the card');
    } finally {
        previewFrame.classList.remove('is-busy');
    }
}

function cardFileName() {
    const h = cardHadith || {};
    const book = (h.collectionTitle || 'hadith').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `${book}-${h.ref || ''}.png`.replace(/-+\.png$/, '.png');
}

function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png');
    });
}

function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function downloadCard() {
    if (!cardCanvas) return;

    try {
        downloadBlob(await canvasToBlob(cardCanvas), cardFileName());
        toast('Card saved');
    } catch (e) {
        console.error(e);
        toast('Download failed — try long-pressing the preview');
    }
}

async function shareCard() {
    if (!cardCanvas) return;

    try {
        const blob = await canvasToBlob(cardCanvas);
        const file = new File([blob], cardFileName(), { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Hadith' });
        } else {
            toast('Sharing images is not supported here');
        }
    } catch (e) {
        if (e && e.name === 'AbortError') return;
        console.error(e);
        toast('Sharing failed');
    }
}

async function copyCardImage() {
    if (!cardCanvas) return;

    try {
        const blob = await canvasToBlob(cardCanvas);
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast('Image copied');
    } catch (e) {
        toast('Your browser blocks image copying — use Save to device');
    }
}

/* ==========================================================
   Sheets — bottom sheets on a phone, dialogs on a wide screen
   ========================================================== */

const sheetReturnFocus = new WeakMap();

function openSheet(sheet, returnFocus) {
    if (!sheet) return;
    // Reused Share/Save sheets must stack above dynamically opened narration details.
    if (sheet.parentNode && sheet.parentNode.lastElementChild !== sheet) sheet.parentNode.appendChild(sheet);
    sheetReturnFocus.set(sheet, returnFocus || document.activeElement);
    // Capture the closed layout after any stacking move, before starting its transition.
    sheet.querySelector('.modal-panel')?.getBoundingClientRect?.();
    sheet.classList.add('is-open');
    sheet.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    const focusTarget = sheet.querySelector('.modal-close, input, button');
    if (focusTarget) setTimeout(() => focusTarget.focus({ preventScroll: true }), 50);
}

function closeSheet(sheet) {
    if (!sheet || !sheet.classList.contains('is-open')) return;
    sheet.classList.remove('is-open');
    sheet.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.modal.is-open')) document.body.style.overflow = '';

    const back = sheetReturnFocus.get(sheet);
    if (back && back.focus) back.focus({ preventScroll: true });
    if (typeof sheet.onClosed === 'function') sheet.onClosed();
}

/* Phone sheets can be dragged down to dismiss. */
function enableSwipeToClose(sheet) {
    const panel = sheet.querySelector('.modal-panel');
    const handle = sheet.querySelector('.sheet-handle');
    if (!panel || !handle) return;

    let startY = 0, startX = 0;
    let dy = 0;
    let dragging = false;

    panel.addEventListener('touchstart', e => {
        // Only on the phone layout (handle visible), and not while the content is scrolled.
        const scroller = e.target.closest('.parity-sheet-body');
        dragging = handle.offsetParent !== null && panel.scrollTop <= 0 && (!scroller || scroller.scrollTop <= 0) && e.touches.length === 1;
        startY = e.touches[0].clientY;
        startX = e.touches[0].clientX;
        dy = 0;
    }, { passive: true });

    panel.addEventListener('touchmove', e => {
        if (!dragging) return;
        dy = e.touches[0].clientY - startY;
        if (Math.abs(e.touches[0].clientX - startX) > Math.abs(dy)) { dragging = false; panel.style.transform = ''; panel.style.transition = ''; return; }
        if (dy <= 0) { panel.style.transform = ''; return; }
        e.preventDefault();
        panel.style.transition = 'none';
        panel.style.transform = 'translateY(' + dy + 'px)';
    }, { passive: false });

    const release = () => {
        if (!dragging) return;
        dragging = false;
        panel.style.transition = '';
        panel.style.transform = '';
        if (dy > 90) closeSheet(sheet);
    };
    panel.addEventListener('touchend', release);
    panel.addEventListener('touchcancel', release);
}

function initSheets() {
    document.querySelectorAll('.modal').forEach(sheet => {
        sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(sheet); });
        sheet.querySelectorAll('.modal-close').forEach(b => b.addEventListener('click', () => closeSheet(sheet)));
        enableSwipeToClose(sheet);
    });

    document.addEventListener('keydown', e => {
        const open = [...document.querySelectorAll('.modal.is-open')].pop();
        if (e.key === 'Tab' && open) {
            const controls = [...open.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex="0"]')]
                .filter(control => control.getClientRects().length);
            const first = controls[0], last = controls[controls.length - 1];
            if (first && (!open.contains(document.activeElement) ||
                (e.shiftKey ? document.activeElement === first : document.activeElement === last))) {
                e.preventDefault();
                (e.shiftKey ? last : first).focus();
            }
            return;
        }
        if (e.key !== 'Escape') return;
        if (closeMenu()) return;
        if (open) closeSheet(open);
    });
}

/**
 * A small confirm/prompt dialog in the sheet style. Resolves to the entered
 * text (prompt), true (confirm), or null when cancelled.
 */
function askDialog({ title, body, input, confirmLabel = 'OK', danger = false, validate }) {
    return new Promise(resolve => {
        const sheet = document.createElement('div');
        sheet.className = 'modal';
        sheet.setAttribute('role', 'dialog');
        sheet.setAttribute('aria-modal', 'true');
        sheet.innerHTML =
            '<div class="modal-panel modal-panel-sm">' +
                '<div class="sheet-handle" aria-hidden="true"></div>' +
                '<div class="modal-head"><div><h2></h2></div></div>' +
                (body ? '<p class="modal-body"></p>' : '') +
                (input ? '<input type="text" maxlength="40" autocomplete="off">' : '') +
                '<p class="modal-error" hidden></p>' +
                '<div class="dialog-actions">' +
                    '<button type="button" class="btn btn-ghost" data-act="cancel">Cancel</button>' +
                    '<button type="button" class="btn ' + (danger ? 'btn-danger' : 'btn-primary') + '" data-act="ok"></button>' +
                '</div>' +
            '</div>';

        sheet.querySelector('h2').textContent = title;
        if (body) sheet.querySelector('.modal-body').textContent = body;
        sheet.querySelector('[data-act="ok"]').textContent = confirmLabel;

        const field = sheet.querySelector('input');
        const error = sheet.querySelector('.modal-error');
        if (field) {
            field.value = input.value || '';
            field.placeholder = input.placeholder || '';
            field.setAttribute('aria-label', input.placeholder || title);
            field.addEventListener('input', () => { error.hidden = true; });
        }

        let result = null;

        function submit() {
            if (field) {
                const value = field.value.trim();
                const problem = validate ? validate(value) : (value ? null : 'Enter a name.');
                if (problem) { error.textContent = problem; error.hidden = false; field.focus(); return; }
                result = value;
            } else {
                result = true;
            }
            closeSheet(sheet);
        }

        sheet.querySelector('[data-act="ok"]').addEventListener('click', submit);
        sheet.querySelector('[data-act="cancel"]').addEventListener('click', () => closeSheet(sheet));
        if (field) field.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
        sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(sheet); });

        sheet.onClosed = () => {
            setTimeout(() => sheet.remove(), 400);
            resolve(result);
        };

        document.body.appendChild(sheet);
        void sheet.offsetWidth;
        openSheet(sheet);
        if (field) setTimeout(() => { field.focus(); field.select(); }, 60);
    });
}

/* ==========================================================
   Menus — anchored popovers (grade filter, theme, options)
   ========================================================== */

let openMenuEl = null;

const CHECK_SVG = '<svg class="menu-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"></path></svg>';

/**
 * items: [{ label, onSelect, checked?, dot?, danger?, icon? } | 'sep']
 * Opens below the anchor, right edges aligned (or above with `above`), flipped when there is no room.
 */
function openMenu(anchor, { title, items, above = false, matchWidth = false }) {
    const wasOpenFor = openMenuEl && openMenuEl.anchor === anchor;
    closeMenu();
    if (wasOpenFor) return;

    const menu = document.createElement('div');
    menu.className = 'menu';
    menu.setAttribute('role', 'menu');
    menu.anchor = anchor;

    if (title) {
        const t = document.createElement('div');
        t.className = 'menu-title';
        t.textContent = title;
        menu.appendChild(t);
    }

    const hasChecks = items.some(i => i && i.checked !== undefined);

    items.forEach(item => {
        if (item === 'sep') {
            const sep = document.createElement('div');
            sep.className = 'menu-sep';
            menu.appendChild(sep);
            return;
        }
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'menu-item' + (item.danger ? ' is-danger' : '');
        b.setAttribute('role', hasChecks ? 'menuitemradio' : 'menuitem');
        if (hasChecks) b.setAttribute('aria-checked', String(Boolean(item.checked)));

        b.innerHTML =
            (item.dot ? '<span class="menu-dot status-' + item.dot + '" style="background:currentColor;border:0;padding:0"></span>' : '') +
            (item.icon || '') +
            '<span class="menu-label"></span>' +
            (item.checked ? CHECK_SVG : '');
        b.querySelector('.menu-label').textContent = item.label;

        b.addEventListener('click', () => {
            closeMenu();
            item.onSelect();
        });
        menu.appendChild(b);
    });

    document.body.appendChild(menu);

    const r = anchor.getBoundingClientRect();
    if (matchWidth) {
        menu.style.width = Math.min(r.width, window.innerWidth - 24) + 'px';
        menu.style.minWidth = '0';
    }
    // offsetWidth/Height: the entry animation scales the box, which would skew a measured rect.
    const m = { width: menu.offsetWidth, height: menu.offsetHeight };
    const gap = 8;
    let top = above ? r.top - gap - m.height : r.bottom + gap;
    if (top < 8 || top + m.height > window.innerHeight - 8) top = above ? r.bottom + gap : r.top - gap - m.height;
    top = Math.max(8, Math.min(top, window.innerHeight - m.height - 8));
    const left = Math.max(12, Math.min(r.right - m.width, window.innerWidth - m.width - 12));

    menu.style.top = top + 'px';
    menu.style.left = left + 'px';
    menu.style.setProperty('--origin', (top < r.top ? 'bottom' : 'top') + ' right');

    anchor.setAttribute('aria-expanded', 'true');
    openMenuEl = menu;

    const first = menu.querySelector('[aria-checked="true"]') || menu.querySelector('.menu-item');
    if (first) first.focus({ preventScroll: true });

    menu.addEventListener('keydown', e => {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        const all = [...menu.querySelectorAll('.menu-item')];
        const i = all.indexOf(document.activeElement);
        all[(i + (e.key === 'ArrowDown' ? 1 : all.length - 1)) % all.length].focus();
    });
}

/** Closes the open menu; true when there was one. */
function closeMenu() {
    if (!openMenuEl) return false;
    const menu = openMenuEl;
    openMenuEl = null;
    menu.anchor.setAttribute('aria-expanded', 'false');
    menu.classList.add('is-closing');
    setTimeout(() => menu.remove(), 140);
    return true;
}

document.addEventListener('pointerdown', e => {
    if (openMenuEl && !openMenuEl.contains(e.target) && !openMenuEl.anchor.contains(e.target)) closeMenu();
}, true);
window.addEventListener('resize', closeMenu);
document.addEventListener('scroll', () => closeMenu(), { passive: true, capture: true });

/* ==========================================================
   Toast
   ========================================================== */

let toastTimer = null;

function toast(message) {
    if (!toastEl) return;

    toastEl.textContent = message;
    toastEl.classList.add('is-visible');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2600);
}

/* ==========================================================
   Reading language and Arabic references
   ========================================================== */

const ARABIC_COLLECTIONS = {
    bukhari: 'صحيح البخاري',
    muslim: 'صحيح مسلم',
    abudawud: 'سنن أبي داود',
    tirmidhi: 'جامع الترمذي',
    nasai: 'سنن النسائي',
    ibnmajah: 'سنن ابن ماجه',
    nawawi40: 'الأربعون النووية',
    qudsi40: 'الأربعون القدسية',
    shahwaliullah40: 'الأربعون لشاه ولي الله الدهلوي'
};

const READING_LABELS = {
    newHadith: ['New Hadith', 'حديث جديد'], seeking: ['Seeking', 'جارٍ البحث'], retry: ['Try again', 'حاول مرة أخرى'],
    notNumbered: ['Not numbered', 'غير مرقّم'], drawFrom: ['Draw from', 'اختر درجة الحديث'],
    copy: ['Copy', 'نسخ'], copied: ['Copied', 'تم النسخ'], save: ['Save', 'حفظ'], saved: ['Saved', 'محفوظ'],
    share: ['Share', 'مشاركة'], shortcuts: ['Keyboard shortcuts', 'اختصارات لوحة المفاتيح'],
    sunnah: ['View on Sunnah.com', 'عرض المصدر'], openRead: ['Open in Read', 'فتح في القراءة'],
    book: ['Collection', 'المجموعة'], hadithNumber: ['Hadith number', 'رقم الحديث'], chapter: ['Chapter', 'الباب'],
    inBook: ['In-book', 'المرجع في الكتاب'], reference: ['Reference', 'المرجع'], grades: ['Grades', 'درجات الحديث'],
    shortcutIntro: ['A few simple ways to move around.', 'طرق بسيطة للتنقّل.'],
    switchTabs: ['Switch tabs', 'التنقّل بين الأقسام'], newNarration: ['New narration', 'حديث جديد'],
    switchLanguage: ['Switch English / Arabic', 'التبديل بين الإنجليزية والعربية'],
    showArabic: ['Show / hide Arabic', 'إظهار النص العربي أو إخفاؤه'], copyHadith: ['Copy Hadith', 'نسخ الحديث'],
    scrollNarration: ['Scroll narration', 'تمرير الحديث'], closePopup: ['Close a popup', 'إغلاق النافذة'],
    shortcutNote: ['Shortcuts pause while you type or use a popup. Selecting text keeps the usual copy behavior.', 'تتوقف الاختصارات أثناء الكتابة أو استخدام نافذة منبثقة. عند تحديد نص، يعمل النسخ بالطريقة المعتادة.']
};
function readingLabel(key, language = readingLanguage()) { return READING_LABELS[key][language === 'ar' ? 1 : 0]; }
function referenceChapter(h, language) { return language === 'ar' ? h.chapterArabic || '' : h.chapter || ''; }
function inBookReference(h, language) {
    if (!h.book || h.inBook == null) return '';
    return language === 'ar' ? `${String(h.book).toLowerCase() === 'introduction' ? 'المقدمة' : 'كتاب ' + h.book}، حديث ${h.inBook}` : `Book ${h.book}, Hadith ${h.inBook}`;
}
function paintReadingControls(language) {
    document.querySelectorAll?.('[data-reading-label]').forEach(node => { node.textContent = readingLabel(node.dataset.readingLabel, language); node.lang = language; node.dir = language === 'ar' ? 'rtl' : 'ltr'; });
    if (generateLabel && !isFetching) generateLabel.textContent = readingLabel('newHadith', language);
    const saveLabel = $('save-label'); if (saveLabel) saveLabel.textContent = readingLabel(saveBtn?.getAttribute('aria-pressed') === 'true' ? 'saved' : 'save', language);
    if (copyLabel) copyLabel.textContent = readingLabel(copyBtn?.classList.contains('is-copied') ? 'copied' : 'copy', language);
}

function retryArabicReference() {
    const shown = current;
    if (!shown?.collection) return;
    loadArabicMetadata(shown.collection).then(metadata => {
        if (current !== shown || readingLanguage() !== 'ar') return;
        const fields = metadata.records?.[shown.key?.slice(4)]; if (!fields) return;
        const chapter = metadata.strings?.[fields[0]] || '', narrator = metadata.strings?.[fields[1]] || '';
        if (shown.chapterArabic === chapter && shown.narratorArabic === narrator) return;
        shown.chapterArabic = chapter; shown.narratorArabic = narrator;
        paintReadingLanguage();
    });
}

const ARABIC_GRADES = {
    Sahih: 'صحيح', Hasan: 'حسن', "Da'if": 'ضعيف', 'Hasan Sahih': 'حسن صحيح',
    'Sahih in chain': 'صحيح الإسناد', 'Hasan in chain': 'حسن الإسناد', "Da'if in chain": 'ضعيف الإسناد',
    'Sahih li ghairih': 'صحيح لغيره', 'Hasan li ghairih': 'حسن لغيره',
    "Da'if Jiddan": 'ضعيف جدا', Munkar: 'منكر', Shadh: 'شاذ',
    "Maudu'": 'موضوع', 'Maudu’': 'موضوع', 'Maudu (fabricated)': 'موضوع', "Mawdu' (Fabricated)": 'موضوع'
};

function normalizeReadingLanguage(value) {
    return value === 'ar' ? 'ar' : 'en';
}

function readingLanguage() {
    return normalizeReadingLanguage(document.documentElement?.dataset.readingLanguage);
}

function usesArabic(h, language) {
    return language === 'ar' && hasArabicWorthShowing(h?.arabic);
}

function arabicCollection(h) {
    return Object.hasOwn(ARABIC_COLLECTIONS, h.collection) ? ARABIC_COLLECTIONS[h.collection] : h.collectionTitle;
}

function arabicGrade(primary) {
    if (!primary) return 'بدون حكم';
    return Object.hasOwn(ARABIC_GRADES, primary.grade) ? ARABIC_GRADES[primary.grade] : primary.grade;
}

function arabicNumber(h) {
    const ref = (h.ref || '').trim();
    if (ref) return `حديث ${ref}`;
    const book = (h.book || '').trim();
    if (!book || h.inBook == null) return '';
    return `${book.toLowerCase() === 'introduction' ? 'المقدمة' : 'كتاب ' + book}، حديث ${h.inBook}`;
}

function arabicReference(h, separator = ' · ') {
    const number = arabicNumber(h);
    return arabicCollection(h) + (number ? separator + number : '');
}

function setReadingLanguage(value) {
    const language = normalizeReadingLanguage(value);
    const changed = language !== readingLanguage();
    document.documentElement.dataset.readingLanguage = language;
    paintReadingControls(language);
    if (language === 'ar') retryArabicReference();
    writePreference('readingLanguage', language);
    if (languageBtn) {
        languageBtn.setAttribute('aria-pressed', String(language === 'ar'));
        languageBtn.setAttribute('aria-label', language === 'ar' ? 'Switch to English' : 'Switch to Arabic');
    }
    stopNarrationScroll();
    paintReadingLanguage();
    resetCopied();
    if (changed && current && !isFetching && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        animateNarrationIn();
        for (const element of [hadithCard, $('ref-brief'), btn, $('reader-actions')].filter(Boolean)) {
            element.getAnimations().forEach(animation => animation.cancel());
            element.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 650, easing: 'ease-in-out' });
        }
    }
}

const pillLocks = new WeakMap();
function lockPill(control, buttons = [control]) {
    if (!control || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const token = {}; pillLocks.set(control, token);
    control.dataset ||= {}; control.dataset.switching = 'true'; control.setAttribute('aria-busy', 'true');
    buttons.forEach(button => { button.disabled = true; });
    control.getBoundingClientRect?.();
    const animations = control.getAnimations?.({ subtree: true }) || [];
    Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
        if (pillLocks.get(control) !== token) return;
        buttons.forEach(button => { button.disabled = false; });
        delete control.dataset.switching; control.setAttribute('aria-busy', 'false'); pillLocks.delete(control);
    });
}

function toggleReadingLanguage() {
    if (languageBtn?.disabled || languageBtn?.dataset?.switching === 'true') return;
    setReadingLanguage(readingLanguage() === 'ar' ? 'en' : 'ar');
    lockPill(languageBtn);
}

function initReadingLanguage() {
    setReadingLanguage(readPreference('readingLanguage'));
    if (languageBtn) languageBtn.addEventListener('click', toggleReadingLanguage);
}

/* ==========================================================
   Theme — a tap flips light/dark; right-click or a long press
   opens Match system / Light / Dark.
   ========================================================== */

const systemDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function applyTheme() {
    const saved = readPreference('theme');
    const dark = saved === 'dark' || (!saved && systemDark && systemDark.matches);
    document.documentElement.classList.toggle('dark', dark);
    if (themeBtn) themeBtn.setAttribute('aria-pressed', String(dark));
}

function setTheme(value) {
    if (themeBtn?.disabled || themeBtn?.dataset?.switching === 'true') return;
    if (value === 'system') writePreference('theme', null);
    else writePreference('theme', value);

    applyTheme();

    if (themeBtn) {
        themeBtn.classList.remove('is-turning');
        void themeBtn.offsetWidth;
        themeBtn.classList.add('is-turning');
        lockPill(themeBtn);
    }
}

function openThemeMenu() {
    if (themeBtn?.disabled || themeBtn?.dataset?.switching === 'true') return;
    const saved = readPreference('theme') || 'system';
    openMenu(themeBtn, {
        title: 'Theme',
        items: [['system', 'Match system'], ['light', 'Light'], ['dark', 'Dark']].map(([value, label]) => ({
            label,
            checked: value === saved,
            onSelect: () => setTheme(value)
        }))
    });
}

function initTheme() {
    applyTheme();
    if (systemDark && systemDark.addEventListener) systemDark.addEventListener('change', applyTheme);

    if (!themeBtn) return;

    let pressTimer = null;
    let longPressed = false;

    themeBtn.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse') return;
        longPressed = false;
        pressTimer = setTimeout(() => { longPressed = true; openThemeMenu(); }, 500);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(type => {
        themeBtn.addEventListener(type, () => clearTimeout(pressTimer));
    });

    themeBtn.addEventListener('contextmenu', e => {
        e.preventDefault();
        if (!longPressed) openThemeMenu();
    });

    themeBtn.addEventListener('click', () => {
        if (longPressed) { longPressed = false; return; }
        setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
    });
}

function generateStars() {
    if (!starsContainer || starsContainer.childElementCount) return;

    const fragment = document.createDocumentFragment();

    for (let i = 0; i < 70; i++) {
        const star = document.createElement('div');
        star.className = 'star';

        star.style.top = Math.random() * 100 + '%';
        star.style.left = Math.random() * 100 + '%';
        star.style.animationDuration = (Math.random() * 3 + 2).toFixed(2) + 's';
        star.style.animationDelay = (Math.random() * 3).toFixed(2) + 's';

        const scale = Math.random() * 1.4 + 0.6;
        star.style.transform = `scale(${scale.toFixed(2)})`;

        fragment.appendChild(star);
    }

    starsContainer.appendChild(fragment);
}

/* ==========================================================
   Header — a hairline appears once the page scrolls under it
   ========================================================== */

function initHeader() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    const update = () => header.classList.toggle('is-scrolled', window.scrollY > 4 || document.querySelector('main:not([hidden])').scrollTop > 4);
    update();
    document.addEventListener('scroll', update, { passive: true, capture: true });
    document.addEventListener('screenchange', update);
}

/* ==========================================================
   Keyboard
   ========================================================== */

let narrationScrollTarget = null;
let narrationScrollFrame = 0;

function stopNarrationScroll() {
    if (narrationScrollFrame) cancelAnimationFrame(narrationScrollFrame);
    narrationScrollFrame = 0;
    narrationScrollTarget = null;
}

function scrollNarrationTo(top) {
    if (!narration) return;
    const target = Math.max(0, Math.min(top, narration.scrollHeight - narration.clientHeight));
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        stopNarrationScroll();
        narration.scrollTop = target;
        return;
    }
    narrationScrollTarget = target;
    if (narrationScrollFrame) return;
    let previous = performance.now();
    let position = narration.scrollTop;
    const step = now => {
        position += (narrationScrollTarget - position) * (1 - Math.exp(-(now - previous) / 80));
        narration.scrollTop = position;
        previous = now;
        if (Math.abs(narrationScrollTarget - position) < 1) {
            narration.scrollTop = narrationScrollTarget;
            stopNarrationScroll();
        } else narrationScrollFrame = requestAnimationFrame(step);
    };
    narrationScrollFrame = requestAnimationFrame(step);
}

function initShortcuts() {
    document.addEventListener('screenchange', stopNarrationScroll);
    if (narration) narration.addEventListener('pointerdown', stopNarrationScroll, { passive: true });
    document.addEventListener('keydown', e => {
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
        if (document.querySelector('.modal.is-open') || openMenuEl) return;
        const reading = typeof SiteNavigation === 'undefined' || SiteNavigation.isReading();
        if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'c' &&
            reading && current && !window.getSelection()?.toString()) {
            e.preventDefault();
            copyText();
            return;
        }
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (reading && narration && !e.shiftKey && ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
            e.preventDefault();
            const top = narrationScrollTarget ?? narration.scrollTop;
            if (e.key === 'Home' || e.key === 'End') scrollNarrationTo(e.key === 'Home' ? 0 : narration.scrollHeight);
            else scrollNarrationTo(top + (e.key === 'ArrowUp' || e.key === 'PageUp' ? -1 : 1) *
                (e.key.startsWith('Page') ? narration.clientHeight * 0.85 : 64));
            return;
        }
        if (e.repeat) return;
        if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !e.shiftKey && typeof SiteNavigation !== 'undefined') {
            e.preventDefault();
            SiteNavigation.cycle(e.key === 'ArrowRight' ? 1 : -1);
            return;
        }
        if (!reading) return;
        if (e.key.toLowerCase() === 'l') {
            e.preventDefault();
            toggleReadingLanguage();
            return;
        }
        const isSpace = e.code === 'Space' || e.key === ' ';
        if (isSpace && readingLanguage() !== 'ar' && expandBtn && !expandBtn.hidden && !isFetching && tag !== 'button' && tag !== 'a') {
            e.preventDefault();
            toggleExpand();
            return;
        }

        const isEnter = e.key === 'Enter';
        const isN = e.key === 'n' || e.key === 'N';

        if ((isEnter || isN || e.key === '+') && btn && !isFetching) {
            // Enter belongs to whichever control has focus.
            if (isEnter && (tag === 'button' || tag === 'a')) return;

            e.preventDefault();
            draw();
        }
    });
    document.addEventListener('wheel', e => {
        if (!narration || (typeof SiteNavigation !== 'undefined' && !SiteNavigation.isReading()) ||
            e.ctrlKey || e.defaultPrevented ||
            Math.abs(e.deltaX) > Math.abs(e.deltaY) || document.querySelector('.modal.is-open') || openMenuEl) return;
        if (dock && dock.contains(e.target) && dock.scrollHeight > dock.clientHeight) return;
        e.preventDefault();
        scrollNarrationTo((narrationScrollTarget ?? narration.scrollTop) +
            e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? narration.clientHeight : 1));
    }, { passive: false });
}
