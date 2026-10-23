/* ==========================================================
   script.js — fetching, rendering, theme, sheets, menus, export
   ========================================================== */

// Narrations use the same shipped Sunnah.com dataset as the Android app, at data/v2/.
// Quality filtering — empty English, bare
// cross-references, and so on — already happened when that dataset was
// built, so there is nothing to reject at draw time any more.
const DATA_BASE = 'data/v2';
const SHARD_SIZE = 250;

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
const scriptBar = $('script-bar');
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
const refInBook = $('ref-inbook');
const refInBookItem = $('ref-inbook-item');
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
const narration = $('narration');

const themeBtn = $('theme-btn');
const prefsBtn = $('prefs-btn');
const prefsModal = $('prefs-modal');
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
let isExpanded = false;
let hasLoadedOnce = false;

/* ==========================================================
   Boot
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {
    generateStars();
    initTheme();
    initHeader();
    initSheets();
    initArabicScript();
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

    // Land on a narration rather than an empty card -- the shared one, for a
    // hadithpull.online/h/ link opened away from the app (?h=urn:<id>).
    if (btn && contentDiv) {
        const params = new URLSearchParams(location.search);
        params.has('h') ? openShared(params.get('h')) : draw();
    }
});

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
    if (shardCache.has(cacheKey)) return shardCache.get(cacheKey);

    const response = await fetch(`${DATA_BASE}/${collection}/${shard}.json`);
    if (!response.ok) throw new Error('shard fetch failed');

    const records = await response.json();
    shardCache.set(cacheKey, records);
    return records;
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
    const saved = localStorage.getItem('gradeFilter');
    return GRADE_FILTERS.find(f => f.key === saved) || GRADE_FILTERS[1];
}

/**
 * Uniform over every eligible hadith, not over collections — otherwise the
 * three forty-hadith books would each be as likely to come up as Bukhari.
 * With a grade filter, uniform over the narrations of that grade.
 */
async function pickRecord() {
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

    isFetching = true;
    setLoading(true);
    const started = performance.now();

    try {
        const { collection, record, position } = await pickRecord();

        const wait = MIN_DRAW_MS - (performance.now() - started);
        if (wait > 0) await new Promise(r => setTimeout(r, wait));

        isFetching = false;
        displayHadith(record, collection, position);
    } catch (error) {
        console.error(error);
        isFetching = false;
        showError();
    }
}

/** An unresolved share must never be replaced with an unrelated narration. */
async function openShared(key) {
    if (isFetching) return;
    isFetching = true;
    setLoading(true);

    try {
        const found = await findRecord(key);

        isFetching = false;
        if (found) {
            displayHadith(found.record, found.collection, found.position);
        } else {
            showError("This shared Hadith isn't available in the current collection. Please check the link.");
            if (generateLabel) generateLabel.textContent = 'New Hadith';
            const url = new URL(location.href);
            url.searchParams.delete('h');
            history.replaceState(null, '', url);
        }
    } catch (error) {
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
        english: record.english,
        arabic: record.arabic || '',
        narrator: record.narrator || '',
        grades: record.grades || [],
        primary: record.primary || null,
        sunnahUrl: `https://sunnah.com/urn/${record.urn}`,
        key: `urn:${record.urn}`
    };
}

function showError(message) {
    contentDiv.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'error-text';
    p.textContent = message || "Couldn't load a narration. Please try again.";
    contentDiv.appendChild(p);

    current = null;
    resetClamp();

    if (narratorEl) narratorEl.hidden = true;
    if (metadataDiv) metadataDiv.hidden = true;
    if (scriptBar) scriptBar.hidden = true;
    if (arabicDiv) arabicDiv.textContent = '';
    if (arabicBlock) arabicBlock.hidden = true;
    paintBrief(null);

    setLoading(false, 'Try again');
}

let skeletonTimer = null;

function setLoading(loading, label) {
    if (!btn) return;

    btn.classList.toggle('is-loading', loading);
    btn.setAttribute('aria-busy', String(loading));
    if (dock) dock.classList.toggle('is-loading', loading);

    if (generateLabel) {
        generateLabel.innerHTML = loading
            ? 'Seeking<span class="seeking-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>'
            : '';
        if (!loading) generateLabel.textContent = label || 'New Hadith';
    }

    clearTimeout(skeletonTimer);

    if (loading) {
        if (copyBtn) copyBtn.disabled = true;
        if (saveBtn) saveBtn.disabled = true;
        if (cardBtn) cardBtn.disabled = true;

        contentDiv.setAttribute('aria-busy', 'true');

        // The current narration lifts away; the skeleton only shows if a draw is slow.
        const outgoing = [contentDiv, narratorEl, expandBtn, metadataDiv, arabicBlock].filter(el => el && !el.hidden);
        outgoing.forEach(el => { el.classList.remove('fade-in'); el.classList.add('fade-out'); });

        skeletonTimer = setTimeout(() => {
            outgoing.forEach(el => el.classList.remove('fade-out'));
            resetClamp();
            if (arabicDiv) arabicDiv.textContent = '';
            if (scriptBar) scriptBar.hidden = true;
            if (narratorEl) narratorEl.hidden = true;
            if (metadataDiv) metadataDiv.hidden = true;
            contentDiv.innerHTML =
                '<div class="skeleton" aria-label="Loading"><span></span><span></span><span></span><span></span></div>';
        }, hasLoadedOnce ? 300 : 0);
    } else {
        contentDiv.setAttribute('aria-busy', 'false');
    }
}

/* ==========================================================
   Rendering
   ========================================================== */

function displayHadith(record, collection, position) {
    clearTimeout(skeletonTimer);
    [contentDiv, narratorEl, expandBtn, metadataDiv, arabicBlock].forEach(el => el && el.classList.remove('fade-out'));

    current = toHadith(record, collection);
    currentPosition = position;
    const url = new URL(location.href);
    url.searchParams.set('h', current.key);
    history.replaceState(null, '', url);
    current.excerpt = buildExcerpt(record.english, PAGE_EXCERPT);
    current.cardExcerpt = buildExcerpt(record.english, CARD_EXCERPT);

    /* English body — the excerpt first, if there is one */
    paintEnglish(false);

    /* Arabic — held back until "Show full Hadith" */
    if (arabicDiv) arabicDiv.textContent = current.arabic;
    if (scriptBar) scriptBar.hidden = true;

    /* Narrator */
    if (narratorEl) {
        narratorEl.textContent = current.narrator;
        narratorEl.hidden = !current.narrator;
    }

    /* Reference — the dock summary always; the full block once expanded */
    paintBrief(current);

    if (refBook) refBook.textContent = current.collectionTitle;
    if (refNumber) refNumber.textContent = current.ref || 'Not numbered';

    if (refChapter && refChapterItem) {
        refChapter.textContent = current.chapter;
        refChapterItem.hidden = !current.chapter;
    }

    const hasInBook = current.book != null && current.inBook != null;
    if (refInBook && refInBookItem) {
        refInBook.textContent = hasInBook ? `Book ${current.book}, Hadith ${current.inBook}` : '';
        refInBookItem.hidden = !hasInBook;
    }

    renderGrades();
    paintStatus(statusEl, current.primary);

    setLoading(false);
    if (copyBtn) copyBtn.disabled = false;
    if (saveBtn) saveBtn.disabled = false;
    if (cardBtn) cardBtn.disabled = false;
    resetCopied();

    applyClamp();

    // Bring the whole narration in together, rather than the text alone. This
    // has to follow applyClamp, which is what makes these visible again —
    // an animation started on a hidden element never runs.
    [contentDiv, narratorEl, expandBtn].forEach(el => {
        if (!el || el.hidden) return;
        el.classList.remove('fade-in');
        void el.offsetWidth;
        el.classList.add('fade-in');
    });

    // A fresh narration starts at the top of its reading area.
    if (narration) narration.scrollTop = 0;
    if (hasLoadedOnce && window.scrollY > 0) window.scrollTo({ top: 0, behavior: 'smooth' });
    hasLoadedOnce = true;

    // Optional hook — bookmarks.js defines this when it's loaded, to sync the
    // Save button with whether this narration is already saved somewhere.
    if (typeof onHadithDisplayed === 'function') onHadithDisplayed(current);
}

/** The dock's reference summary: collection · number, grade pill, chapter, Sunnah link. */
function paintBrief(hadith) {
    if (briefMain) briefMain.textContent = hadith ? referenceLabel(hadith) : '';
    if (briefSub) briefSub.textContent = hadith ? hadith.chapter : '';

    if (briefStatus) {
        briefStatus.hidden = !hadith;
        if (hadith) {
            briefStatus.className = 'status has-menu ' + gradeClass(hadith.primary);
            briefStatusLabel.textContent = gradeLabel(hadith.primary);
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
function paintStatus(el, primary) {
    if (!el) return;
    el.hidden = false;
    el.textContent = gradeLabel(primary);
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
function renderGrades() {
    if (!refGrades || !refGradesList) return;

    refGradesList.innerHTML = '';
    const lines = current ? gradeLines(current) : [];

    lines.forEach(line => {
        const li = document.createElement('li');
        li.textContent = line;
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
    if (scriptBar) scriptBar.hidden = true;
}

function applyClamp() {
    if (!expandBtn || !current) return;

    resetClamp();

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
    const hasArabic = Boolean(current && hasArabicWorthShowing(current.arabic));

    // When the narration is already complete, "Show full Hadith" promises
    // something it cannot deliver — the only thing left is the Arabic.
    expandLabel.textContent = hasMoreText ? 'Show full Hadith' : 'Show Arabic';

    if (hasMoreText) {
        const notes = [current.english.trim().split(/\s+/).length + ' words'];
        if (hasArabic) notes.push('Arabic');

        const span = document.createElement('span');
        span.className = 'word-count';
        span.textContent = ' · ' + notes.join(' · ');
        expandLabel.appendChild(span);
    }
}

function toggleExpand() {
    isExpanded = !isExpanded;
    expandBtn.setAttribute('aria-expanded', String(isExpanded));

    if (hadithCard) hadithCard.classList.toggle('is-expanded', isExpanded);

    /* Swap the excerpt for the full text (or back), growing to fit */
    if (current && current.excerpt) {
        const from = contentDiv.getBoundingClientRect().height;

        contentDiv.style.maxHeight = from + 'px';
        paintEnglish(isExpanded);

        const to = contentDiv.scrollHeight;

        requestAnimationFrame(() => { contentDiv.style.maxHeight = to + 'px'; });

        // Release the fixed height afterwards, so later reflows (resize, text
        // size) are not trapped at this value.
        setTimeout(() => { contentDiv.style.maxHeight = 'none'; }, ANIM_MS);
    }

    /* The Arabic, which sits above the translation, with its typeface switch */
    const showArabic = Boolean(current && hasArabicWorthShowing(current.arabic));
    if (arabicBlock && showArabic) {
        if (isExpanded) {
            arabicBlock.hidden = false;
            arabicBlock.style.maxHeight = '0px';

            requestAnimationFrame(() => {
                arabicBlock.style.maxHeight = arabicBlock.scrollHeight + 'px';
            });

            setTimeout(() => { if (isExpanded) arabicBlock.style.maxHeight = 'none'; }, ANIM_MS);
        } else {
            arabicBlock.style.maxHeight = arabicBlock.scrollHeight + 'px';

            requestAnimationFrame(() => { arabicBlock.style.maxHeight = '0px'; });
            setTimeout(() => { if (!isExpanded) arabicBlock.hidden = true; }, ANIM_MS - 100);
        }
    }
    if (scriptBar) scriptBar.hidden = !(isExpanded && showArabic);

    if (metadataDiv) metadataDiv.hidden = !isExpanded;

    updateExpandLabel();

    // Return to the start of the narration so the Arabic, when shown, opens in view.
    if (narration && narration.scrollTop > 0) narration.scrollTo({ top: 0, behavior: 'smooth' });
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
            title: 'Draw from',
            above: true,
            items: GRADE_FILTERS.map(f => ({
                label: f.label,
                dot: f.dot,
                checked: f.key === selected,
                onSelect: () => {
                    localStorage.setItem('gradeFilter', f.key);
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
   Text size — the "Aa" sheet
   ========================================================== */

const TEXT_SIZES = [
    { key: 'comfortable', scale: 1,    label: 'Comfortable' },
    { key: 'large',       scale: 1.12, label: 'Large' },
    { key: 'largest',     scale: 1.26, label: 'Largest' }
];

function setTextSize(key) {
    const size = TEXT_SIZES.find(s => s.key === key) || TEXT_SIZES[0];

    document.documentElement.style.setProperty('--reading-scale', String(size.scale));
    localStorage.setItem('textSize', size.key);

    document.querySelectorAll('[data-size]').forEach(b => {
        b.setAttribute('aria-checked', String(b.dataset.size === size.key));
    });

    if (current && !isExpanded) requestAnimationFrame(applyClamp);
}

function initTextSize() {
    setTextSize(localStorage.getItem('textSize'));

    document.querySelectorAll('[data-size]').forEach(button => {
        button.addEventListener('click', () => setTextSize(button.dataset.size));
    });

    if (prefsBtn && prefsModal) {
        prefsBtn.addEventListener('click', () => openSheet(prefsModal, prefsBtn));
        const done = $('prefs-done');
        if (done) done.addEventListener('click', () => closeSheet(prefsModal));
    }
}

/* ==========================================================
   Copy the text
   ========================================================== */

function plainText(h) {
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
    if (await copyHadith(current, false)) {
        copyBtn.classList.add('is-copied');
        if (copyLabel) copyLabel.textContent = 'Copied';
        clearTimeout(copiedTimer);
        copiedTimer = setTimeout(resetCopied, 2000);
    }
}

function resetCopied() {
    if (!copyBtn) return;
    copyBtn.classList.remove('is-copied');
    if (copyLabel) copyLabel.textContent = 'Copy';
}

/** Copies a narration with its reference; toasts the outcome unless `quiet`. */
async function copyHadith(h, announce = true) {
    try {
        await navigator.clipboard.writeText(plainText(h));
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

    if (cardBtn) cardBtn.addEventListener('click', () => openCard(current));

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
        cardArabic = localStorage.getItem('cardArabic') !== 'false';
        cardArabicBtn.setAttribute('aria-pressed', String(cardArabic));

        cardArabicBtn.addEventListener('click', () => {
            cardArabic = !cardArabic;
            cardArabicBtn.setAttribute('aria-pressed', String(cardArabic));
            localStorage.setItem('cardArabic', String(cardArabic));
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
function shareText(h) {
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
function openCard(h) {
    if (!h || !modal) return;
    cardHadith = h;

    // Only offer the Arabic switch when there is Arabic to include.
    if (cardArabicBtn) cardArabicBtn.hidden = !h.arabic;

    if (shareWhatsapp) shareWhatsapp.href = 'https://wa.me/?text=' + encodeURIComponent(shareText(h));
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
            site: SITE_NAME,
            // Whichever typeface they are reading in is the one they get.
            script: document.documentElement.getAttribute('data-arabic-script')
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

const sheetReturnFocus = new Map();

function openSheet(sheet, returnFocus) {
    if (!sheet) return;
    sheetReturnFocus.set(sheet, returnFocus || document.activeElement);
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

function initSheets() {
    document.querySelectorAll('.modal').forEach(sheet => {
        sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(sheet); });
        sheet.querySelectorAll('.modal-close').forEach(b => b.addEventListener('click', () => closeSheet(sheet)));
    });

    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        if (closeMenu()) return;
        const open = [...document.querySelectorAll('.modal.is-open')].pop();
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
function openMenu(anchor, { title, items, above = false }) {
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
   Arabic toggle
   ========================================================== */

/**
 * Switches the Arabic typeface. All three settings render exactly the same
 * text — the source has one Arabic version, so this changes the letterforms
 * and weight, not the orthography.
 */
function setArabicScript(script) {
    document.documentElement.setAttribute('data-arabic-script', script);
    localStorage.setItem('arabicScript', script);

    document.querySelectorAll('[data-script]').forEach(b => {
        b.setAttribute('aria-pressed', String(b.dataset.script === script));
    });

    // The faces have different metrics, so the revealed block resizes.
    if (isExpanded && arabicBlock && !arabicBlock.hidden) {
        arabicBlock.style.maxHeight = 'none';
    }
}

const ARABIC_SCRIPTS = ['naskh', 'clear', 'bold'];

function initArabicScript() {
    let saved = localStorage.getItem('arabicScript');

    // "indopak" was the old name for a face that was not IndoPak at all.
    // "nastaliq" replaced it with an honest label, but Nastaliq is a
    // different script entirely (Urdu prose, never used for Quran or
    // Hadith) — "bold" is the same slot, now a proper Naskh cut.
    if (saved === 'indopak') saved = 'nastaliq';
    if (saved === 'nastaliq') saved = 'bold';

    setArabicScript(ARABIC_SCRIPTS.includes(saved) ? saved : 'naskh');

    document.querySelectorAll('[data-script]').forEach(button => {
        button.addEventListener('click', () => setArabicScript(button.dataset.script));
    });
}

/* ==========================================================
   Theme — a tap flips light/dark; right-click or a long press
   opens Match system / Light / Dark.
   ========================================================== */

const systemDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function applyTheme() {
    const saved = localStorage.getItem('theme');
    const dark = saved === 'dark' || (!saved && systemDark && systemDark.matches);
    document.documentElement.classList.toggle('dark', dark);
    if (themeBtn) themeBtn.setAttribute('aria-pressed', String(dark));
}

function setTheme(value) {
    if (value === 'system') localStorage.removeItem('theme');
    else localStorage.setItem('theme', value);

    applyTheme();

    if (themeBtn) {
        themeBtn.classList.remove('is-turning');
        void themeBtn.offsetWidth;
        themeBtn.classList.add('is-turning');
    }
}

function openThemeMenu() {
    const saved = localStorage.getItem('theme') || 'system';
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

    const main = document.querySelector('main');
    const update = () => header.classList.toggle('is-scrolled', window.scrollY > 4 || main.scrollTop > 4);
    update();
    document.addEventListener('scroll', update, { passive: true, capture: true });
}

/* ==========================================================
   Keyboard
   ========================================================== */

function initShortcuts() {
    document.addEventListener('keydown', e => {
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (document.querySelector('.modal.is-open') || openMenuEl) return;

        const isSpace = e.code === 'Space' || e.key === ' ';
        const isN = e.key === 'n' || e.key === 'N';

        if ((isSpace || isN) && btn && !isFetching) {
            // Space belongs to whichever control has focus.
            if (isSpace && (tag === 'button' || tag === 'a')) return;

            e.preventDefault();
            draw();
        }
    });
}
