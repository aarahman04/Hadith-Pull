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

const MAX_RETRIES = 6;

/* ==========================================================
   DOM
   ========================================================== */

const $ = id => document.getElementById(id);

const btn = $('generate-btn');
const contentDiv = $('hadith-content');
const arabicDiv = $('arabic-text');
const narratorEl = $('narrator');
const metadataDiv = $('metadata');
const referenceText = $('reference');
const chapterText = $('chapter');
const statusEl = $('status');

const copyBtn = $('copy-btn');
const cardBtn = $('card-btn');
const arabicBtn = $('arabic-btn');
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
const modalClose = $('modal-close');
const toastEl = $('toast');

let retryCount = 0;
let current = null;          // the hadith currently on screen
let cardTheme = 'night';
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
    initArabicPreference();
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

        if (!text) {
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

    if (arabicDiv) arabicDiv.classList.remove('is-visible');
    if (narratorEl) narratorEl.hidden = true;
    if (metadataDiv) metadataDiv.hidden = true;

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
        if (cardBtn) cardBtn.disabled = true;

        resetClamp();

        if (arabicDiv) {
            arabicDiv.classList.remove('is-visible');
            arabicDiv.textContent = '';
        }
        if (narratorEl) narratorEl.hidden = true;
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
    const arabic = (hadith.hadithArabic || '').trim();
    const status = (hadith.status || '').trim();

    current = {
        english,
        arabic,
        narrator,
        book,
        chapter,
        number: hadith.hadithNumber,
        status
    };

    /* English body */
    contentDiv.innerHTML = '';
    paragraphize(english).forEach(part => {
        const p = document.createElement('p');
        p.textContent = part;
        contentDiv.appendChild(p);
    });
    contentDiv.classList.remove('fade-in');
    void contentDiv.offsetWidth;
    contentDiv.classList.add('fade-in');

    /* Arabic */
    if (arabicDiv) {
        arabicDiv.textContent = arabic;
        const wanted = localStorage.getItem('showArabic') !== 'false';
        arabicDiv.classList.toggle('is-visible', Boolean(arabic) && wanted);
    }

    /* Narrator */
    if (narratorEl) {
        narratorEl.textContent = narrator;
        narratorEl.hidden = !narrator;
    }

    /* Reference */
    referenceText.textContent = `${book}  ·  Hadith ${hadith.hadithNumber}`;

    if (chapterText) {
        chapterText.textContent = chapter;
        chapterText.hidden = !chapter;
    }

    if (statusEl) {
        statusEl.textContent = status || 'Unclassified';
        statusEl.className = 'status ' + statusClass(status);
    }

    metadataDiv.hidden = false;

    setLoading(false);
    if (copyBtn) copyBtn.disabled = false;
    if (cardBtn) cardBtn.disabled = false;

    applyClamp();

    // On a phone the button sits below the card, so a fresh narration would
    // otherwise start off-screen. Don't do this on the very first load.
    if (hasLoadedOnce && window.innerWidth <= 720 && hadithCard) {
        hadithCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    hasLoadedOnce = true;
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

const CLAMP_LINES = { english: 9, arabic: 4 };
const CLAMP_SLACK = 28;      // px of overflow we tolerate before clamping

function clampTargets() {
    return [
        { el: contentDiv, lines: CLAMP_LINES.english },
        { el: arabicDiv, lines: CLAMP_LINES.arabic }
    ].filter(t => t.el);
}

function lineLimit(el, lines) {
    const lh = parseFloat(getComputedStyle(el).lineHeight);
    return Number.isFinite(lh) ? Math.round(lh * lines) : 0;
}

function resetClamp() {
    clampTargets().forEach(({ el }) => {
        el.classList.remove('is-collapsed');
        el.style.maxHeight = '';
        delete el.dataset.clampLimit;
    });

    isExpanded = false;

    if (expandBtn) {
        expandBtn.hidden = true;
        expandBtn.setAttribute('aria-expanded', 'false');
    }
}

function applyClamp() {
    if (!expandBtn) return;

    resetClamp();

    let clamped = false;

    clampTargets().forEach(({ el, lines }) => {
        // An element that is display:none has no measurable height.
        if (!el.offsetParent && el !== contentDiv) return;

        const limit = lineLimit(el, lines);
        if (!limit || el.scrollHeight <= limit + CLAMP_SLACK) return;

        el.dataset.clampLimit = String(limit);
        el.classList.add('is-collapsed');
        el.style.maxHeight = limit + 'px';
        clamped = true;
    });

    expandBtn.hidden = !clamped;
    updateExpandLabel();
}

function updateExpandLabel() {
    if (!expandLabel) return;

    if (isExpanded) {
        expandLabel.textContent = 'Show less';
        return;
    }

    const words = current && current.english
        ? current.english.trim().split(/\s+/).length
        : 0;

    expandLabel.textContent = 'Read the full narration';

    if (words) {
        const span = document.createElement('span');
        span.className = 'word-count';
        span.textContent = ` · ${words} words`;
        expandLabel.appendChild(span);
    }
}

function toggleExpand() {
    isExpanded = !isExpanded;
    expandBtn.setAttribute('aria-expanded', String(isExpanded));

    clampTargets().forEach(({ el }) => {
        const limit = el.dataset.clampLimit;
        if (!limit) return;

        if (isExpanded) {
            el.style.maxHeight = el.scrollHeight + 'px';
            el.classList.remove('is-collapsed');

            // Release the fixed height once the animation is done, so later
            // reflows (resize, text size) are not trapped at this value.
            setTimeout(() => { if (isExpanded) el.style.maxHeight = 'none'; }, 520);
        } else {
            el.style.maxHeight = el.scrollHeight + 'px';
            requestAnimationFrame(() => {
                el.classList.add('is-collapsed');
                el.style.maxHeight = limit + 'px';
            });
        }
    });

    updateExpandLabel();

    if (!isExpanded && hadithCard) {
        const top = hadithCard.getBoundingClientRect().top;
        if (top < 0) hadithCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

function siteLabel() {
    const host = location.hostname;
    if (!host || host === 'localhost' || host === '127.0.0.1') return 'hadith-pull';

    const dir = location.pathname.replace(/\/[^/]*$/, '').replace(/\/$/, '');
    return (host + dir).replace(/^www\./, '');
}

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

    if (downloadBtn) downloadBtn.addEventListener('click', downloadCard);
    if (copyImageBtn) copyImageBtn.addEventListener('click', copyCardImage);

    if (shareBtn && navigator.canShare && navigator.share) {
        shareBtn.hidden = false;
        shareBtn.addEventListener('click', shareCard);
    }
}

function openCard() {
    if (!current) return;

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

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
        cardCanvas = await HadithCard.render({ ...current, site: siteLabel() }, cardTheme);

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

function initArabicPreference() {
    if (!arabicBtn) return;

    const wanted = localStorage.getItem('showArabic') !== 'false';
    arabicBtn.setAttribute('aria-pressed', String(wanted));

    arabicBtn.addEventListener('click', () => {
        const next = arabicBtn.getAttribute('aria-pressed') !== 'true';

        arabicBtn.setAttribute('aria-pressed', String(next));
        localStorage.setItem('showArabic', String(next));

        if (arabicDiv) {
            arabicDiv.classList.toggle('is-visible', next && Boolean(arabicDiv.textContent.trim()));
        }

        if (current && !isExpanded) applyClamp();
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
