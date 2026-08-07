/* ==========================================================
   script.js — fetching, rendering, theme, navigation, export
   ========================================================== */

const API_KEY = '$2y$10$SfS5zkVmbWbo35xuzdS18tuA9qebNnWXQxckJo6EOUW6UQC0MS';

const BOOKS = {
    'sahih-bukhari': 7563,
    'sahih-muslim': 3033,
    'al-tirmidhi': 3956,
    'abu-dawood': 5274,
    'ibn-e-majah': 4341,
    'sunan-nasai': 5758,
    'mishkat': 6294,
    'musnad-ahmad': 28199,
    'al-silsila-sahiha': 4035
};

// A few more attempts than before, because narrations that cannot stand on
// their own are now skipped as well as empty ones.
const MAX_RETRIES = 10;

/**
 * Collections are sequences: a narration may say "the same as above" or carry
 * nothing but a second chain of transmitters, because it follows the one it
 * refers to. Pulled out at random, it points at nothing. Skip those.
 */
const CROSS_REFERENCE = [
    /\bas (?:mentioned|stated|narrated|reported|described) (?:above|before|earlier|previously)\b/i,
    /\bsame as (?:above|the (?:above|previous|preceding|foregoing))\b/i,
    /\bsimilar to the (?:above|previous|preceding|one above)\b/i,
    /\ba similar (?:hadith|narration|tradition|report|version)\b/i,
    /\b(?:through|with) (?:a|another|a different) (?:other )?chain of (?:narrators|transmitters|authorities)\b/i,
    /\bhas (?:already )?been (?:mentioned|narrated|reported|transmitted) (?:above|before|earlier)\b/i,
    /\blike the (?:previous|preceding|foregoing) (?:hadith|narration|tradition)\b/i,
    /\bto the same effect\b/i,
    /\bthe same (?:meaning|as the preceding|as the previous)\b/i,
    /\bsee\s+(?:hadith\s*)?(?:no\.?|number)?\s*\d+/i,
    /\bmentioned in the (?:previous|preceding) (?:hadith|narration)\b/i
];

function isSelfContained(text) {
    const clean = text.trim();

    // Bare fragments carry nothing to read. The bar is deliberately low:
    // "Actions are but by intention" is a complete narration.
    if (clean.length < 15 || clean.split(/\s+/).length < 3) return false;

    // A long narration that happens to mention another chain still has a body
    // worth reading; a short one that does is usually only a pointer.
    if (clean.length < 300 && CROSS_REFERENCE.some(re => re.test(clean))) return false;

    return true;
}

/* ==========================================================
   DOM
   ========================================================== */

const $ = id => document.getElementById(id);

const btn = $('generate-btn');
const contentDiv = $('hadith-content');
const arabicDiv = $('arabic-text');
const arabicBlock = $('arabic-block');
const scriptToggle = $('script-toggle');
const narratorEl = $('narrator');

const refBrief = $('ref-brief');
const briefMain = $('brief-main');
const briefSub = $('brief-sub');
const briefStatus = $('brief-status');

const metadataDiv = $('metadata');
const refBook = $('ref-book');
const refNumber = $('ref-number');
const refChapter = $('ref-chapter');
const refChapterItem = $('ref-chapter-item');
const statusEl = $('status');

const copyBtn = $('copy-btn');
const saveBtn = $('save-btn');
const cardBtn = $('card-btn');
const sizeBtn = $('size-btn');
const sizeLabel = $('size-label');
const expandBtn = $('expand-btn');
const expandLabel = $('expand-label');
const hadithCard = $('hadith-card');

const themeBtn = $('theme-btn');
const starsContainer = $('stars');
const hamburger = $('hamburger');
const navMenu = $('nav-menu');

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
const modalClose = $('modal-close');
const toastEl = $('toast');

let retryCount = 0;
let current = null;          // the hadith currently on screen
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
    syncThemeIcon();
    generateStars();
    initNav();
    initArabicScript();
    initTextSize();
    initShortcuts();
    initCardUI();
    initClamp();

    if (btn) btn.addEventListener('click', () => getHadith());
    if (copyBtn) copyBtn.addEventListener('click', copyText);

    // Land on a narration rather than an empty card.
    if (btn && contentDiv) getHadith();
});

/* ==========================================================
   Fetching
   ========================================================== */

async function getHadith() {
    if (!btn || !contentDiv || isFetching) return;

    isFetching = true;
    setLoading(true);

    try {
        const slugs = Object.keys(BOOKS);
        const slug = slugs[Math.floor(Math.random() * slugs.length)];
        const number = Math.floor(Math.random() * BOOKS[slug]) + 1;

        const url = `https://hadithapi.com/api/hadiths?apiKey=${encodeURIComponent(API_KEY)}` +
                    `&book=${slug}&hadithNumber=${number}`;

        const response = await fetch(url);

        if (response.status === 401 || response.status === 403) {
            isFetching = false;
            showError('The Hadith service rejected this request. The API key may need renewing.');
            return;
        }

        if (!response.ok) {
            // A missing hadith number is an ordinary miss, not a failure — roll again.
            isFetching = false;
            retry();
            return;
        }

        const data = await response.json();

        let hadith = null;
        if (data.hadiths && data.hadiths.data && data.hadiths.data.length) {
            hadith = data.hadiths.data[0];
        } else if (data.data && data.data.length) {
            hadith = data.data[0];
        }

        const text = hadith && hadith.hadithEnglish ? hadith.hadithEnglish.trim() : '';

        if (!text || !isSelfContained(text)) {
            isFetching = false;
            retry();
            return;
        }

        retryCount = 0;
        isFetching = false;
        displayHadith(hadith, slug);

    } catch (error) {
        console.error(error);
        isFetching = false;
        showError();
    }
}

function retry() {
    retryCount++;

    if (retryCount > MAX_RETRIES) {
        retryCount = 0;
        contentDiv.innerHTML = '';
        const p = document.createElement('p');
        p.className = 'placeholder';
        p.textContent = 'Could not find a narration just now. Please try again.';
        contentDiv.appendChild(p);
        setLoading(false, 'Try again');
        return;
    }

    getHadith();
}

function showError(message) {
    contentDiv.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'error-text';
    p.textContent = message || 'Could not reach the Hadith service. Check your connection and try again.';
    contentDiv.appendChild(p);

    resetClamp();

    // resetClamp restores the reference for whatever is in `current`, which is
    // still the previous narration — it must not sit under an error message.
    if (refBrief) refBrief.hidden = true;
    if (narratorEl) narratorEl.hidden = true;
    if (metadataDiv) metadataDiv.hidden = true;
    if (scriptToggle) scriptToggle.hidden = true;

    setLoading(false, 'Try again');
}

function setLoading(loading, label) {
    if (!btn) return;

    btn.disabled = loading;
    btn.classList.toggle('is-loading', loading);

    const labelNode = btn.childNodes[btn.childNodes.length - 1];
    if (labelNode && labelNode.nodeType === Node.TEXT_NODE) {
        labelNode.textContent = loading ? ' Seeking… ' : ' ' + (label || 'New Hadith') + ' ';
    }

    if (loading) {
        if (copyBtn) copyBtn.disabled = true;
        if (saveBtn) saveBtn.disabled = true;
        if (cardBtn) cardBtn.disabled = true;

        resetClamp();

        if (arabicDiv) arabicDiv.textContent = '';
        if (scriptToggle) scriptToggle.hidden = true;
        if (narratorEl) narratorEl.hidden = true;
        if (refBrief) refBrief.hidden = true;
        if (metadataDiv) metadataDiv.hidden = true;

        contentDiv.setAttribute('aria-busy', 'true');
        contentDiv.innerHTML =
            '<div class="skeleton" aria-label="Loading"><span></span><span></span><span></span><span></span></div>';
    } else {
        contentDiv.setAttribute('aria-busy', 'false');
    }
}

/* ==========================================================
   Rendering
   ========================================================== */

function titleCase(slug) {
    return slug.split('-')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

function displayHadith(hadith, slug) {
    const rawNarrator = (hadith.englishNarrator || '').trim();
    let english = (hadith.hadithEnglish || '').trim();

    // The English body often repeats the narrator line — keep it in one place only.
    if (rawNarrator && english.toLowerCase().startsWith(rawNarrator.toLowerCase())) {
        english = english.slice(rawNarrator.length).replace(/^[\s:.\-—]+/, '');
    }

    // Presented as an attribution: "— Narrated Abu Huraira"
    const narrator = rawNarrator ? '— ' + rawNarrator.replace(/[\s:]+$/, '') : '';

    const book = (hadith.book && hadith.book.bookName) ? hadith.book.bookName : titleCase(slug);
    const chapter = (hadith.chapter && hadith.chapter.chapterEnglish) ? hadith.chapter.chapterEnglish.trim() : '';
    // Normalised once here, so everything downstream — the toggle, the reveal,
    // the card — agrees on whether there is Arabic worth showing.
    const rawArabic = (hadith.hadithArabic || '').trim();
    const arabic = hasArabicWorthShowing(rawArabic) ? rawArabic : '';

    const status = (hadith.status || '').trim();

    current = {
        english,
        excerpt: buildExcerpt(english, PAGE_EXCERPT),
        cardExcerpt: buildExcerpt(english, CARD_EXCERPT),
        arabic,
        narrator,
        book,
        chapter,
        number: hadith.hadithNumber,
        status,
        slug
    };

    /* English body — the excerpt first, if there is one */
    paintEnglish(false);

    /* Arabic — held back until "Show full Hadith" */
    if (arabicDiv) arabicDiv.textContent = arabic;
    if (scriptToggle) scriptToggle.hidden = !arabic;

    /* Narrator */
    if (narratorEl) {
        narratorEl.textContent = narrator;
        narratorEl.hidden = !narrator;
    }

    /* Reference — compact by default, in full once expanded */
    if (briefMain) briefMain.textContent = `${book}  ·  Hadith ${hadith.hadithNumber}`;
    if (briefSub) briefSub.textContent = chapter;

    if (refBook) refBook.textContent = book;
    if (refNumber) refNumber.textContent = hadith.hadithNumber;

    if (refChapter && refChapterItem) {
        refChapter.textContent = chapter;
        refChapterItem.hidden = !chapter;
    }

    [statusEl, briefStatus].forEach(el => {
        if (!el) return;
        el.textContent = status || 'Unclassified';
        el.className = 'status ' + statusClass(status);
    });

    setLoading(false);
    if (copyBtn) copyBtn.disabled = false;
    if (saveBtn) saveBtn.disabled = false;
    if (cardBtn) cardBtn.disabled = false;

    applyClamp();

    // Bring the whole narration in together, rather than the text alone. This
    // has to follow applyClamp, which is what makes these visible again —
    // an animation started on a hidden element never runs.
    [contentDiv, narratorEl, refBrief].forEach(el => {
        if (!el || el.hidden) return;
        el.classList.remove('fade-in');
        void el.offsetWidth;
        el.classList.add('fade-in');
    });

    // On a phone the button sits below the card, so a fresh narration would
    // otherwise start off-screen. Don't do this on the very first load.
    if (hasLoadedOnce && window.innerWidth <= 720 && hadithCard) {
        hadithCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    hasLoadedOnce = true;

    // Optional hook — bookmarks.js defines this when it's loaded, to sync the
    // Save button with whether this narration is already saved somewhere.
    if (typeof onHadithDisplayed === 'function') onHadithDisplayed(current);
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

function statusClass(status) {
    const s = (status || '').toLowerCase();
    if (s.includes('sahih')) return 'status-sahih';
    if (s.includes('hasan')) return 'status-hasan';
    if (s.includes('daif') || s.includes('weak')) return 'status-daif';
    return 'status-unknown';
}

/* ==========================================================
   Long narrations — collapsed to an excerpt, expandable
   ==========================================================
   The full text already arrives in the same API response, so expanding
   is instant: this only controls how much of it is on screen.
   ========================================================== */

const ANIM_MS = 500;

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

    if (refBrief) refBrief.hidden = !current;
    if (metadataDiv) metadataDiv.hidden = true;
}

function applyClamp() {
    if (!expandBtn || !current) return;

    resetClamp();

    // There is always more to show if the Arabic exists, even when the
    // translation fits in full.
    expandBtn.hidden = !current.excerpt && !current.arabic;

    updateExpandLabel();
}

function updateExpandLabel() {
    if (!expandLabel) return;

    if (isExpanded) {
        expandLabel.textContent = 'Show less';
        return;
    }

    const hasMoreText = Boolean(current && current.excerpt);
    const hasArabic = Boolean(current && current.arabic);

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

    /* The Arabic, which sits above the translation */
    if (arabicBlock && current && current.arabic) {
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
            setTimeout(() => { if (!isExpanded) arabicBlock.hidden = true; }, ANIM_MS);
        }
    }

    /* Reference: compact, or in full */
    if (refBrief) refBrief.hidden = isExpanded;
    if (metadataDiv) metadataDiv.hidden = !isExpanded;

    updateExpandLabel();

    // Revealing the Arabic pushes the translation down, so keep the top of the
    // card in view either way.
    if (hadithCard && hadithCard.getBoundingClientRect().top < 0) {
        hadithCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function initClamp() {
    if (!expandBtn) return;

    expandBtn.addEventListener('click', toggleExpand);

    // Web fonts change the measured height, so re-measure once they land.
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => { if (current && !isExpanded) applyClamp(); });
    }

    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { if (current && !isExpanded) applyClamp(); }, 200);
    });
}

/* ==========================================================
   Text size
   ========================================================== */

const TEXT_SIZES = [
    { key: 'comfortable', scale: 1,    label: 'Comfortable' },
    { key: 'large',       scale: 1.12, label: 'Large' },
    { key: 'largest',     scale: 1.26, label: 'Largest' }
];

function setTextSize(index, announce) {
    const size = TEXT_SIZES[index] || TEXT_SIZES[0];

    document.documentElement.style.setProperty('--reading-scale', String(size.scale));
    localStorage.setItem('textSize', size.key);

    if (sizeLabel) sizeLabel.textContent = size.label;
    if (sizeBtn) sizeBtn.setAttribute('aria-pressed', String(index > 0));

    if (announce) toast('Text size: ' + size.label);

    if (current && !isExpanded) requestAnimationFrame(applyClamp);
}

function initTextSize() {
    if (!sizeBtn) return;

    const saved = localStorage.getItem('textSize');
    let index = Math.max(0, TEXT_SIZES.findIndex(s => s.key === saved));

    setTextSize(index, false);

    sizeBtn.addEventListener('click', () => {
        index = (index + 1) % TEXT_SIZES.length;
        setTextSize(index, true);
    });
}

/* ==========================================================
   Copy the text
   ========================================================== */

function plainText() {
    if (!current) return '';

    const lines = [current.english];
    if (current.narrator) lines.push(current.narrator);

    lines.push('');
    lines.push(`${current.book}, Hadith ${current.number}${current.status ? ' (' + current.status + ')' : ''}`);
    if (current.chapter) lines.push(`Chapter: ${current.chapter}`);

    return lines.join('\n');
}

async function copyText() {
    try {
        await navigator.clipboard.writeText(plainText());
        toast('Hadith copied to clipboard');
    } catch (e) {
        toast('Copying is blocked by your browser');
    }
}

/* ==========================================================
   Card export
   ========================================================== */

const SITE_NAME = 'hadithpull.online';
const SITE_URL = 'https://hadithpull.online';

function initCardUI() {
    if (!cardBtn || !modal || typeof HadithCard === 'undefined') return;

    cardBtn.addEventListener('click', openCard);
    if (modalClose) modalClose.addEventListener('click', closeCard);

    modal.addEventListener('click', e => {
        if (e.target === modal) closeCard();
    });

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

        // Leave a single primary action in the dialog.
        if (downloadBtn) downloadBtn.classList.replace('btn-primary', 'btn-ghost');
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
function shareText() {
    if (!current) return SITE_URL;

    const ref = `${current.book}, Hadith ${current.number}`;
    return `"${current.excerpt || current.english}"\n\n— ${ref}\n${SITE_URL}`;
}

function updateShareLinks() {
    if (shareWhatsapp) {
        shareWhatsapp.href = 'https://wa.me/?text=' + encodeURIComponent(shareText());
    }

    if (shareFacebook) {
        shareFacebook.href = 'https://www.facebook.com/sharer/sharer.php?u=' +
            encodeURIComponent(SITE_URL);
    }
}

function openCard() {
    if (!current) return;

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Only offer the Arabic switch when there is Arabic to include.
    if (cardArabicBtn) cardArabicBtn.hidden = !current.arabic;

    updateShareLinks();
    buildCard();
    if (modalClose) modalClose.focus();
}

function closeCard() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (cardBtn) cardBtn.focus();
}

async function buildCard() {
    if (!current) return;

    previewFrame.classList.add('is-busy');

    try {
        // A 200-word narration set small enough to fit is not readable at
        // arm's length. The card carries the excerpt and says so.
        cardCanvas = await HadithCard.render({
            ...current,
            english: current.cardExcerpt || current.english,
            excerpt: Boolean(current.cardExcerpt),
            arabic: cardArabic ? current.arabic : '',
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
    const book = (current && current.book ? current.book : 'hadith').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `${book}-${current && current.number ? current.number : ''}.png`.replace(/-+\.png$/, '.png');
}

function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png');
    });
}

async function downloadCard() {
    if (!cardCanvas) return;

    try {
        const blob = await canvasToBlob(cardCanvas);
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = cardFileName();
        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(() => URL.revokeObjectURL(url), 2000);
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
        toast('Image copied to clipboard');
    } catch (e) {
        toast('Your browser blocks image copying — use Download');
    }
}

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
 * text — the API returns one Arabic version, so this changes the letterforms
 * and weight, not the orthography.
 */
function setArabicScript(script) {
    document.documentElement.setAttribute('data-arabic-script', script);
    localStorage.setItem('arabicScript', script);

    document.querySelectorAll('[data-script]').forEach(b => {
        b.setAttribute('aria-pressed', String(b.dataset.script === script));
    });

    // The two faces have different metrics, so the revealed block resizes.
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
   Theme
   ========================================================== */

function syncThemeIcon() {
    // The icons are swapped in CSS via html.dark — nothing to do beyond a11y state.
    if (themeBtn) {
        themeBtn.setAttribute('aria-pressed', String(document.documentElement.classList.contains('dark')));
    }
}

if (themeBtn) {
    themeBtn.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');

        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        themeBtn.setAttribute('aria-pressed', String(isDark));

        if (isDark) generateStars();
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
   Navigation
   ========================================================== */

function initNav() {
    if (!hamburger || !navMenu) return;

    hamburger.addEventListener('click', () => {
        const open = navMenu.classList.toggle('is-open');
        hamburger.setAttribute('aria-expanded', String(open));
    });

    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('is-open');
            hamburger.setAttribute('aria-expanded', 'false');
        });
    });

    document.addEventListener('click', e => {
        if (!navMenu.contains(e.target) && !hamburger.contains(e.target)) {
            navMenu.classList.remove('is-open');
            hamburger.setAttribute('aria-expanded', 'false');
        }
    });
}

/* ==========================================================
   Keyboard
   ========================================================== */

function initShortcuts() {
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && modal && modal.classList.contains('is-open')) {
            closeCard();
            return;
        }

        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (modal && modal.classList.contains('is-open')) return;

        const isSpace = e.code === 'Space' || e.key === ' ';
        const isN = e.key === 'n' || e.key === 'N';

        if ((isSpace || isN) && btn && !btn.disabled) {
            // Space belongs to whichever control has focus.
            if (isSpace && (tag === 'button' || tag === 'a')) return;

            e.preventDefault();
            getHadith();
        }
    });
}
