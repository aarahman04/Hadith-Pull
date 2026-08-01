/* ==========================================================
   card.js — renders a 1080×1080 shareable Hadith card
   on a <canvas>, no external libraries.
   ========================================================== */

const HadithCard = (function () {

    const SIZE = 1080;          // Instagram square
    const FRAME = 48;           // inset of the decorative frame
    const PAD = 112;            // text safe area

    const THEMES = {
        night: {
            bgFrom: '#0e1d1a',
            bgTo: '#060c0c',
            vignette: 'rgba(0, 0, 0, 0.55)',
            accent: '#d8b478',
            text: '#f5f1e7',
            muted: '#9fada4',
            rule: 'rgba(216, 180, 120, 0.30)',
            ruleSoft: 'rgba(245, 241, 231, 0.14)',
            pattern: 'rgba(216, 180, 120, 1)',
            patternAlpha: 0.05
        },
        parchment: {
            bgFrom: '#fdfaf3',
            bgTo: '#eee4d1',
            vignette: 'rgba(120, 94, 55, 0.16)',
            accent: '#8a6534',
            text: '#201c17',
            muted: '#786d5e',
            rule: 'rgba(138, 101, 52, 0.35)',
            ruleSoft: 'rgba(32, 28, 23, 0.12)',
            pattern: 'rgba(138, 101, 52, 1)',
            patternAlpha: 0.055
        }
    };

    const STATUS_COLORS = {
        sahih:   { night: '#7fdca4', parchment: '#1c7c47' },
        hasan:   { night: '#f0cf7a', parchment: '#96690b' },
        daif:    { night: '#f0a0a0', parchment: '#a53232' },
        unknown: { night: '#a9b6bd', parchment: '#6b7280' }
    };

    /* ---------- font loading ---------- */

    let fontsPromise = null;

    function ensureFonts() {
        if (fontsPromise) return fontsPromise;

        const specs = [
            '600 40px "Cormorant Garamond"',
            '500 40px "Cormorant Garamond"',
            '400 40px "Cormorant Garamond"',
            '400 40px "Amiri"',
            '700 40px "Amiri"',
            '400 24px "Inter"',
            '500 24px "Inter"',
            '600 24px "Inter"',
            '700 24px "Inter"'
        ];

        const loads = document.fonts && document.fonts.load
            ? specs.map(s => document.fonts.load(s).catch(() => {}))
            : [];

        fontsPromise = Promise.all(loads).catch(() => {});
        return fontsPromise;
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

    function tracked(ctx, text, cx, y, spacing) {
        // Draws centred text with manual letter-spacing.
        const chars = Array.from(text);
        let total = 0;
        chars.forEach(c => { total += ctx.measureText(c).width + spacing; });
        total -= spacing;

        let x = cx - total / 2;
        const prevAlign = ctx.textAlign;
        ctx.textAlign = 'left';

        chars.forEach(c => {
            ctx.fillText(c, x, y);
            x += ctx.measureText(c).width + spacing;
        });

        ctx.textAlign = prevAlign;
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
                return { size, lines, height, lineHeight, truncated: false };
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
            truncated: true
        };
    }

    function drawBlock(ctx, block, cx, top, color, align) {
        ctx.fillStyle = color;
        ctx.textAlign = align || 'center';
        ctx.textBaseline = 'alphabetic';

        const step = block.size * block.lineHeight;

        block.lines.forEach((line, i) => {
            // Baseline sits ~72% down the line box — visually centred for both scripts.
            ctx.fillText(line, cx, top + i * step + block.size * 0.78);
        });
    }

    /* ---------- decorative bits ---------- */

    function drawBackground(ctx, t) {
        const g = ctx.createLinearGradient(0, 0, SIZE * 0.35, SIZE);
        g.addColorStop(0, t.bgFrom);
        g.addColorStop(1, t.bgTo);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, SIZE, SIZE);

        // warm halo behind the text
        const halo = ctx.createRadialGradient(SIZE / 2, SIZE * 0.42, 40, SIZE / 2, SIZE * 0.42, SIZE * 0.75);
        halo.addColorStop(0, hexToRgba(t.accent, 0.10));
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, SIZE, SIZE);

        drawPattern(ctx, t);

        // vignette
        const v = ctx.createRadialGradient(SIZE / 2, SIZE / 2, SIZE * 0.35, SIZE / 2, SIZE / 2, SIZE * 0.78);
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
        ctx.lineWidth = 2;
        roundRect(ctx, FRAME, FRAME, SIZE - FRAME * 2, SIZE - FRAME * 2, 26);
        ctx.stroke();

        ctx.strokeStyle = t.ruleSoft;
        ctx.lineWidth = 1;
        roundRect(ctx, FRAME + 10, FRAME + 10, SIZE - (FRAME + 10) * 2, SIZE - (FRAME + 10) * 2, 18);
        ctx.stroke();

        // corner diamonds
        const corners = [
            [FRAME, FRAME], [SIZE - FRAME, FRAME],
            [SIZE - FRAME, SIZE - FRAME], [FRAME, SIZE - FRAME]
        ];

        ctx.fillStyle = t.accent;
        ctx.globalAlpha = 0.75;

        corners.forEach(([x, y]) => {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(Math.PI / 4);
            ctx.fillRect(-5, -5, 10, 10);
            ctx.restore();
        });

        ctx.restore();
    }

    function drawDivider(ctx, t, cx, y, width) {
        ctx.save();
        ctx.strokeStyle = t.rule;
        ctx.lineWidth = 1.4;

        const gap = 16;
        const half = width / 2;

        ctx.beginPath();
        ctx.moveTo(cx - half, y);
        ctx.lineTo(cx - gap, y);
        ctx.moveTo(cx + gap, y);
        ctx.lineTo(cx + half, y);
        ctx.stroke();

        ctx.fillStyle = t.accent;
        ctx.globalAlpha = 0.85;
        ctx.save();
        ctx.translate(cx, y);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-4.5, -4.5, 9, 9);
        ctx.restore();

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
     * @param {Object} data  { english, arabic, narrator, book, chapter, number, status, site }
     * @param {String} themeName 'night' | 'parchment'
     * @returns {Promise<HTMLCanvasElement>}
     */
    async function render(data, themeName) {
        await ensureFonts();

        const t = THEMES[themeName] || THEMES.night;

        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;

        const ctx = canvas.getContext('2d');
        const cx = SIZE / 2;
        const innerWidth = SIZE - PAD * 2;

        drawBackground(ctx, t);
        drawFrame(ctx, t);

        /* --- masthead --- */
        ctx.fillStyle = t.accent;
        ctx.font = '600 24px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        tracked(ctx, 'HADITH', cx, 126, 9);

        drawDivider(ctx, t, cx, 158, 140);

        /* --- bottom: watermark --- */
        ctx.fillStyle = t.muted;
        ctx.font = '500 20px "Inter", sans-serif';
        tracked(ctx, (data.site || 'hadith-pull').toUpperCase(), cx, 1012, 3.4);

        /* --- reference block (laid out from the bottom up) --- */
        const hasReference = Boolean(data.book || data.number);

        const refBottom = 962;
        let refTop = refBottom;

        if (hasReference) {
            const statusText = (data.status || '').trim();
            const chapterText = (data.chapter || '').trim();

            const pillH = statusText ? 46 : 0;
            const pillGap = statusText ? 26 : 0;
            const subH = chapterText ? 30 : 0;

            const blockH = pillH + pillGap + 38 + subH;
            refTop = refBottom - blockH;

            let y = refTop;

            // status pill
            if (statusText) {
                const key = statusKey(statusText);
                const color = STATUS_COLORS[key][themeName] || STATUS_COLORS[key].night;

                ctx.font = '600 21px "Inter", sans-serif';
                const label = statusText.toUpperCase();

                const chars = Array.from(label);
                let textW = 0;
                chars.forEach(c => { textW += ctx.measureText(c).width + 2.6; });
                textW -= 2.6;

                const pillW = textW + 72;
                const pillX = cx - pillW / 2;

                ctx.fillStyle = hexToRgba(color, 0.14);
                roundRect(ctx, pillX, y, pillW, pillH, pillH / 2);
                ctx.fill();

                ctx.strokeStyle = hexToRgba(color, 0.45);
                ctx.lineWidth = 1.3;
                roundRect(ctx, pillX, y, pillW, pillH, pillH / 2);
                ctx.stroke();

                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(pillX + 26, y + pillH / 2, 5, 0, Math.PI * 2);
                ctx.fill();

                tracked(ctx, label, cx + 13, y + pillH / 2 + 7.5, 2.6);

                y += pillH + pillGap;
            }

            // book + number
            ctx.fillStyle = t.text;
            ctx.font = '600 29px "Inter", sans-serif';
            ctx.textAlign = 'center';

            const refLine = [data.book, data.number ? 'Hadith ' + data.number : '']
                .filter(Boolean)
                .join('  ·  ');

            ctx.fillText(ellipsize(ctx, refLine, innerWidth), cx, y + 27);
            y += 38;

            // chapter
            if (chapterText) {
                ctx.fillStyle = t.muted;
                ctx.font = '400 22px "Inter", sans-serif';
                ctx.fillText(ellipsize(ctx, chapterText, innerWidth), cx, y + 22);
            }

            drawDivider(ctx, t, cx, refTop - 46, 200);
        }

        /* --- content band --- */
        const bandTop = 210;
        const bandBottom = (hasReference ? refTop - 92 : 960);
        const band = bandBottom - bandTop;

        const arabic = (data.arabic || '').trim();
        const narrator = (data.narrator || '').trim();
        const english = (data.english || '').trim();

        const narratorH = narrator ? 46 : 0;
        const arabicGap = arabic ? 56 : 0;

        let available = band - narratorH - arabicGap;
        let arabicBlock = null;

        if (arabic) {
            ctx.font = '400 44px "Amiri", serif';
            arabicBlock = fitBlock(ctx, arabic, {
                maxWidth: innerWidth,
                maxHeight: available * 0.44,
                font: s => `400 ${s}px "Amiri", serif`,
                min: 28,
                max: 50,
                lineHeight: 1.9
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
            min: 28,
            max: 54,
            lineHeight: 1.52
        });

        const totalH = (arabicBlock ? arabicBlock.height + arabicGap : 0)
            + englishBlock.height
            + narratorH;

        // Biased slightly below centre — the masthead above is lighter than the
        // reference block below, so true centring reads as top-heavy.
        let y = bandTop + Math.max(0, (band - totalH) * 0.55);

        if (arabicBlock) {
            ctx.save();
            ctx.direction = 'rtl';
            drawBlock(ctx, arabicBlock, cx, y, t.text, 'center');
            ctx.restore();

            y += arabicBlock.height + arabicGap * 0.42;
            drawDivider(ctx, t, cx, y, 160);
            y += arabicGap * 0.58;
        }

        drawBlock(ctx, englishBlock, cx, y, t.text, 'center');
        y += englishBlock.height;

        if (narrator) {
            ctx.fillStyle = t.muted;
            ctx.font = 'italic 400 24px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(ellipsize(ctx, narrator, innerWidth), cx, y + 34);
        }

        return canvas;
    }

    return { render, SIZE };
})();
