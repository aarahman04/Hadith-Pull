/* ==========================================================
   card.js — renders a 1080×1080 shareable Hadith card
   on a <canvas>, no external libraries.
   ========================================================== */

const HadithCard = (function () {

    const SIZE = 1080;          // Instagram square
    const FRAME = 46;           // inset of the frame line
    const PAD = 118;            // text safe area

    /* The same palettes as the site, so a saved card looks like where it
       came from. Light is the default. */
    const THEMES = {
        light: {
            bgFrom: '#fdfbf6',
            bgTo: '#f0e9dc',
            glow: 'rgba(169, 126, 60, 0.10)',
            vignette: 'rgba(120, 94, 55, 0.06)',
            accent: '#a97e3c',
            text: '#1c1917',
            muted: '#7a716a',
            rule: 'rgba(28, 25, 23, 0.13)',
            pattern: '#a97e3c',
            patternAlpha: 0.03
        },
        dark: {
            bgFrom: '#141c22',
            bgTo: '#0a0f14',
            glow: 'rgba(94, 234, 212, 0.07)',
            vignette: 'rgba(0, 0, 0, 0.38)',
            accent: '#e0bd85',
            text: '#ece9e4',
            muted: '#9aa3a8',
            rule: 'rgba(231, 229, 228, 0.16)',
            pattern: '#e0bd85',
            patternAlpha: 0.035
        }
    };

    // Mirrors the on-page Arabic typeface toggle. Same text either way.
    const ARABIC_FACES = {
        naskh:   { family: '"Amiri", serif', min: 28, max: 50, lineHeight: 1.9 },
        indopak: { family: '"Scheherazade New", "Amiri", serif', min: 31, max: 56, lineHeight: 2.05 }
    };

    const STATUS_COLORS = {
        sahih:   { light: '#15803d', dark: '#6ee7a8' },
        hasan:   { light: '#a16207', dark: '#fcd34d' },
        daif:    { light: '#b91c1c', dark: '#fca5a5' },
        unknown: { light: '#64748b', dark: '#a5b1bd' }
    };

    /* ---------- font loading ---------- */

    /**
     * Google Fonts splits each family into unicode-range subsets, and
     * document.fonts.load() defaults to loading whichever subset covers a
     * single space — the Latin one. The Arabic subset therefore has to be
     * requested with actual Arabic text, or the canvas silently falls back
     * to a system font.
     */
    function ensureFonts(sample) {
        if (!document.fonts || !document.fonts.load) return Promise.resolve();

        const latin = (sample && sample.english) || 'Hadith';
        const arabic = (sample && sample.arabic) || '';

        const jobs = [
            ['600 40px "Cormorant Garamond"', latin],
            ['500 40px "Cormorant Garamond"', latin],
            ['400 40px "Cormorant Garamond"', latin],
            ['400 24px "Inter"', latin],
            ['500 24px "Inter"', latin],
            ['600 24px "Inter"', latin],
            ['italic 400 24px "Inter"', latin]
        ];

        if (arabic) {
            jobs.push(['400 40px "Amiri"', arabic]);
            jobs.push(['400 40px "Scheherazade New"', arabic]);
        }

        return Promise
            .all(jobs.map(([spec, text]) => document.fonts.load(spec, text).catch(() => {})))
            .catch(() => {});
    }

    /* ---------- small canvas helpers ---------- */

    function roundRect(ctx, x, y, w, h, r) {
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, r);
            return;
        }
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function trackedWidth(ctx, text, spacing) {
        let total = 0;
        Array.from(text).forEach(c => { total += ctx.measureText(c).width + spacing; });
        return total - spacing;
    }

    function trackedAt(ctx, text, x, y, spacing) {
        // Draws left-aligned text with manual letter-spacing.
        const prevAlign = ctx.textAlign;
        ctx.textAlign = 'left';

        Array.from(text).forEach(c => {
            ctx.fillText(c, x, y);
            x += ctx.measureText(c).width + spacing;
        });

        ctx.textAlign = prevAlign;
    }

    function tracked(ctx, text, cx, y, spacing) {
        const total = trackedWidth(ctx, text, spacing);
        trackedAt(ctx, text, cx - total / 2, y, spacing);
        return total;
    }

    /* Pills — the grading, plus an "excerpt" marker when the text was cut. */

    const PILL_FONT = '600 21px "Inter", sans-serif';
    const PILL_H = 46;
    const PILL_TRACK = 2.6;

    function pillWidth(ctx, pill) {
        ctx.font = PILL_FONT;
        return trackedWidth(ctx, pill.label, PILL_TRACK) + (pill.dot ? 72 : 52);
    }

    /** @param anchor  left edge, or right edge when align is 'right' */
    function drawPills(ctx, pills, anchor, y, align) {
        if (!pills.length) return;

        ctx.font = PILL_FONT;

        const gap = 14;
        const widths = pills.map(p => pillWidth(ctx, p));
        const total = widths.reduce((a, b) => a + b, 0) + gap * (pills.length - 1);

        let x = align === 'right' ? anchor - total : anchor;

        pills.forEach((pill, i) => {
            const w = widths[i];

            ctx.fillStyle = hexToRgba(pill.color, 0.14);
            roundRect(ctx, x, y, w, PILL_H, PILL_H / 2);
            ctx.fill();

            ctx.strokeStyle = hexToRgba(pill.color, 0.45);
            ctx.lineWidth = 1.3;
            roundRect(ctx, x, y, w, PILL_H, PILL_H / 2);
            ctx.stroke();

            ctx.fillStyle = pill.color;

            if (pill.dot) {
                ctx.beginPath();
                ctx.arc(x + 26, y + PILL_H / 2, 5, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.font = PILL_FONT;
            trackedAt(ctx, pill.label, x + (pill.dot ? 44 : 26), y + PILL_H / 2 + 7.5, PILL_TRACK);

            x += w + gap;
        });

        return total;
    }

    function wrap(ctx, text, maxWidth) {
        const lines = [];

        text.split('\n').forEach(paragraph => {
            const words = paragraph.split(/\s+/).filter(Boolean);
            if (!words.length) return;

            let line = words[0];

            for (let i = 1; i < words.length; i++) {
                const candidate = line + ' ' + words[i];
                if (ctx.measureText(candidate).width <= maxWidth) {
                    line = candidate;
                } else {
                    lines.push(line);
                    line = words[i];
                }
            }
            lines.push(line);
        });

        return lines;
    }

    /**
     * Shrinks the font until the wrapped text fits the box.
     * Truncates with an ellipsis when even the smallest size overflows.
     */
    function fitBlock(ctx, text, opts) {
        const { maxWidth, maxHeight, font, min, max, lineHeight } = opts;

        for (let size = max; size >= min; size -= 1) {
            ctx.font = font(size);
            const lines = wrap(ctx, text, maxWidth);
            const height = lines.length * size * lineHeight;

            if (height <= maxHeight) {
                return { size, lines, height, lineHeight, font: font(size), truncated: false };
            }
        }

        ctx.font = font(min);
        const lines = wrap(ctx, text, maxWidth);
        const keep = Math.max(1, Math.floor(maxHeight / (min * lineHeight)));
        const kept = lines.slice(0, keep);

        let last = kept[kept.length - 1] || '';
        while (last.length && ctx.measureText(last + ' …').width > maxWidth) {
            last = last.slice(0, -1);
        }
        kept[kept.length - 1] = last.replace(/[\s,;:.]+$/, '') + ' …';

        return {
            size: min,
            lines: kept,
            height: kept.length * min * lineHeight,
            lineHeight,
            font: font(min),
            truncated: true
        };
    }

    function drawBlock(ctx, block, x, top, color, align) {
        // Draw with the font the text was measured in — anything else and the
        // wrapping is wrong, because a later fit may have changed ctx.font.
        ctx.font = block.font;
        ctx.fillStyle = color;
        ctx.textAlign = align || 'left';
        ctx.textBaseline = 'alphabetic';

        const step = block.size * block.lineHeight;

        block.lines.forEach((line, i) => {
            // Baseline sits ~78% down the line box — visually right for both scripts.
            ctx.fillText(line, x, top + i * step + block.size * 0.78);
        });
    }

    /* ---------- decorative bits ---------- */

    function drawBackground(ctx, t) {
        const g = ctx.createLinearGradient(0, 0, SIZE * 0.3, SIZE);
        g.addColorStop(0, t.bgFrom);
        g.addColorStop(1, t.bgTo);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, SIZE, SIZE);

        // soft warmth behind the text, matching the site's ambient wash
        const halo = ctx.createRadialGradient(SIZE / 2, SIZE * 0.34, 40, SIZE / 2, SIZE * 0.34, SIZE * 0.8);
        halo.addColorStop(0, t.glow);
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, SIZE, SIZE);

        drawPattern(ctx, t);

        const v = ctx.createRadialGradient(SIZE / 2, SIZE / 2, SIZE * 0.42, SIZE / 2, SIZE / 2, SIZE * 0.8);
        v.addColorStop(0, 'rgba(0,0,0,0)');
        v.addColorStop(1, t.vignette);
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, SIZE, SIZE);
    }

    function drawPattern(ctx, t) {
        // A faint grid of eight-point stars (two overlapping squares).
        const step = 108;
        const r = 21;

        ctx.save();
        ctx.globalAlpha = t.patternAlpha;
        ctx.strokeStyle = t.pattern;
        ctx.lineWidth = 1.4;

        for (let y = step / 2; y < SIZE; y += step) {
            for (let x = step / 2; x < SIZE; x += step) {
                for (let k = 0; k < 2; k++) {
                    ctx.save();
                    ctx.translate(x, y);
                    ctx.rotate(k * Math.PI / 4);
                    ctx.strokeRect(-r, -r, r * 2, r * 2);
                    ctx.restore();
                }
            }
        }

        ctx.restore();
    }

    function drawFrame(ctx, t) {
        ctx.save();
        ctx.strokeStyle = t.rule;
        ctx.lineWidth = 1.6;
        roundRect(ctx, FRAME, FRAME, SIZE - FRAME * 2, SIZE - FRAME * 2, 30);
        ctx.stroke();
        ctx.restore();
    }

    /* A plain hairline. Quieter than an ornament, and the eye reads past it. */
    function drawRule(ctx, t, x1, y, x2) {
        ctx.save();
        ctx.strokeStyle = t.rule;
        ctx.lineWidth = 1.3;

        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
        ctx.restore();
    }

    function hexToRgba(hex, alpha) {
        const h = hex.replace('#', '');
        const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
        return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
    }

    function statusKey(status) {
        const s = (status || '').toLowerCase();
        if (s.includes('sahih')) return 'sahih';
        if (s.includes('hasan')) return 'hasan';
        if (s.includes('daif') || s.includes('weak') || s.includes('da\'if')) return 'daif';
        return 'unknown';
    }

    function ellipsize(ctx, text, maxWidth) {
        if (ctx.measureText(text).width <= maxWidth) return text;
        let out = text;
        while (out.length > 1 && ctx.measureText(out + '…').width > maxWidth) {
            out = out.slice(0, -1);
        }
        return out.trim() + '…';
    }

    /* ---------- the card ---------- */

    /**
     * Deliberately spare: the narration, who narrated it, where to find it,
     * and where it came from. Nothing else earns its place at this size.
     *
     * @param {Object} data  { english, arabic, narrator, book, number, status, site, script }
     * @param {String} themeName 'light' | 'dark'
     * @returns {Promise<HTMLCanvasElement>}
     */
    async function render(data, themeName) {
        await ensureFonts(data);

        const t = THEMES[themeName] || THEMES.light;

        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;

        const ctx = canvas.getContext('2d');

        // Everything hangs off two margins: the translation and the furniture
        // on the left, the Arabic on the right. Centred ragged text was the
        // thing that read as unarranged.
        const left = PAD;
        const right = SIZE - PAD;
        const innerWidth = right - left;

        drawBackground(ctx, t);
        drawFrame(ctx, t);

        /* --- masthead --- */
        ctx.fillStyle = t.accent;
        ctx.font = '600 22px "Inter", sans-serif';
        ctx.textBaseline = 'alphabetic';
        trackedAt(ctx, 'HADITH', left, 122, 10);

        /* --- bottom: watermark --- */
        ctx.fillStyle = t.muted;
        ctx.font = '500 20px "Inter", sans-serif';
        trackedAt(ctx, (data.site || 'hadithpull.online').toUpperCase(), left, 1002, 3.4);

        /* --- reference: measured now, drawn after the text, once we know
               whether the narration had to be cut short. --- */
        const hasReference = Boolean(data.book || data.number);
        const statusText = (data.status || '').trim();

        const refBaseline = 928;              // "Sahih Bukhari · Hadith 1"
        const pillTop = 894;                  // same row, right-aligned
        const ruleY = 848;

        const arabic = (data.arabic || '').trim();
        const narrator = (data.narrator || '').trim();
        const english = (data.english || '').trim();

        const bandTop = 196;
        const narratorH = narrator ? 50 : 0;
        const arabicGap = arabic ? 64 : 0;

        function fitContent(bandBottom) {
            const band = bandBottom - bandTop;
            let available = band - narratorH - arabicGap;
            let arabicBlock = null;

            if (arabic) {
                const face = ARABIC_FACES[data.script] || ARABIC_FACES.naskh;

                // The translation is the point of the card; the Arabic supports
                // it, and yields space when the translation needs it.
                arabicBlock = fitBlock(ctx, arabic, {
                    maxWidth: innerWidth,
                    maxHeight: available * (english.length > 280 ? 0.32 : 0.40),
                    font: s => `400 ${s}px ${face.family}`,
                    min: face.min,
                    max: face.max,
                    lineHeight: face.lineHeight
                });

                // An Arabic text that had to be cut is worse than none at all.
                if (arabicBlock.truncated && arabicBlock.lines.length < 2) {
                    arabicBlock = null;
                    available = band - narratorH;
                } else {
                    available -= arabicBlock.height;
                }
            }

            const englishBlock = fitBlock(ctx, english, {
                maxWidth: innerWidth,
                maxHeight: available,
                font: s => `500 ${s}px "Cormorant Garamond", Georgia, serif`,
                min: 29,
                max: 60,
                lineHeight: 1.48
            });

            return { band, arabicBlock, englishBlock };
        }

        // The pills share the reference row, so their presence no longer
        // changes the vertical layout — one pass is enough.
        const { band, arabicBlock, englishBlock } =
            fitContent(hasReference ? ruleY - 56 : 940);

        const totalH = (arabicBlock ? arabicBlock.height + arabicGap : 0)
            + englishBlock.height
            + narratorH;

        // Biased slightly below centre — the masthead above is lighter than the
        // reference block below, so true centring reads as top-heavy.
        let y = bandTop + Math.max(0, (band - totalH) * 0.55);

        if (arabicBlock) {
            // Arabic reads right-to-left, so it hangs off the right margin.
            ctx.save();
            ctx.direction = 'rtl';
            drawBlock(ctx, arabicBlock, right, y, t.text, 'right');
            ctx.restore();

            y += arabicBlock.height + arabicGap * 0.45;
            drawRule(ctx, t, left, y, left + 88);
            y += arabicGap * 0.55;
        }

        drawBlock(ctx, englishBlock, left, y, t.text, 'left');
        y += englishBlock.height;

        if (narrator) {
            ctx.fillStyle = t.muted;
            ctx.font = 'italic 400 25px "Inter", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(ellipsize(ctx, narrator, innerWidth), left, y + 38);
        }

        /* --- reference: source on the left, grading on the right --- */
        if (hasReference) {
            drawRule(ctx, t, left, ruleY, right);

            const pills = [];

            if (statusText) {
                const key = statusKey(statusText);
                pills.push({
                    label: statusText.toUpperCase(),
                    color: STATUS_COLORS[key][themeName] || STATUS_COLORS[key].light,
                    dot: true
                });
            }

            // Be honest when the narration is not here in full.
            if (data.excerpt || englishBlock.truncated) {
                pills.push({ label: 'EXCERPT', color: t.muted, dot: false });
            }

            const pillsWide = drawPills(ctx, pills, right, pillTop, 'right') || 0;

            ctx.fillStyle = t.text;
            ctx.font = '600 31px "Inter", sans-serif';
            ctx.textAlign = 'left';

            // The pills share this row, so the source name yields to them —
            // never the number, which is what someone looks the hadith up by.
            const refRoom = innerWidth - (pillsWide ? pillsWide + 30 : 0);

            const numberPart = data.number ? '  ·  Hadith ' + data.number : '';
            const bookPart = ellipsize(ctx, data.book || '', refRoom - ctx.measureText(numberPart).width);

            ctx.fillText(bookPart + numberPart, left, refBaseline);
        }

        return canvas;
    }

    return { render, SIZE };
})();
