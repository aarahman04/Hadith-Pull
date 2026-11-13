/* ==========================================================
   card.js — renders a shareable Hadith card on a <canvas>, no
   external libraries. Port of Android card/CardRenderer.kt,
   CardArtwork.kt and TextMeasure.kt: artworks, shapes, branding.
   ========================================================== */

const HadithCard = (function () {

    /** 0xAARRGGBB, as Android writes its colours, to a CSS colour. */
    function argb(n, alphaScale = 1) {
        return `rgba(${(n >>> 16) & 255}, ${(n >>> 8) & 255}, ${n & 255}, ${(((n >>> 24) & 255) / 255) * alphaScale})`;
    }

    /* Export sizes. Story keeps text below the strip Instagram covers at the top. */
    const FORMATS = [
        { id: 'square', title: 'Post', label: '1:1', width: 1080, height: 1080, safeTop: 0 },
        { id: 'portrait', title: 'Portrait', label: '4:5', width: 1080, height: 1350, safeTop: 0 },
        { id: 'story', title: 'Story', label: '9:16', width: 1080, height: 1920, safeTop: 150 },
        { id: 'landscape', title: 'Wide', label: '16:9', width: 1920, height: 1080, safeTop: 0 }
    ];
    const formatById = id => FORMATS.find(f => f.id === id) || FORMATS[0];

    const focus = (x, y) => ({ x, y });
    function place(left, top, right, bottom, extra = {}) {
        const p = { left, top, right, bottom, bias: .55, englishMin: 29, englishMax: 60, dayFocus: focus(.5, .5), ...extra };
        if (!p.nightFocus) p.nightFocus = p.dayFocus;
        return p;
    }
    /** The original card's text band; the larger shapes let the text grow to fill them. */
    function classicPlace(format) {
        return place(118, 196 + format.safeTop, format.width - 118, format.height - 288, {
            bias: format.id === 'story' ? .45 : .55,
            englishMax: { square: 60, portrait: 68, story: 78, landscape: 84 }[format.id]
        });
    }

    /* Arabic faces (Android cardArabicFace). */
    const ARABIC = {
        naskh: { family: '"Amiri", serif', weight: 400, min: 28, max: 50, lineHeight: 1.9 },
        clear: { family: '"Scheherazade New", "Amiri", serif', weight: 400, min: 31, max: 56, lineHeight: 2.05 },
        bold: { family: '"Noto Naskh Arabic", "Amiri", serif', weight: 700, min: 27, max: 48, lineHeight: 2.05 }
    };

    const FOOT = { footText: argb(0xFFF6F7F4), footMuted: argb(0xFFD3D9DC), footRule: argb(0x47FFFFFF), footOnDark: true };
    function look(bgFrom, bgTo, text, muted, accent, rule, extra = {}) {
        return { bgFrom: argb(bgFrom), bgTo: argb(bgTo), text: argb(text), muted: argb(muted), accent: argb(accent), rule: argb(rule), veil: 0, footScrim: 0, ...extra };
    }
    function photoLook(top, bottom, veil, darkInk = false) {
        return look(top, bottom,
            darkInk ? 0xFF172436 : 0xFFFFF9EE, darkInk ? 0xFF34465C : 0xFFDBE4ED, darkInk ? 0xFF5B422A : 0xFFFFE1A1, darkInk ? 0x40172436 : 0x50FFFFFF,
            { veil, footScrim: 0xCB080E17, ...FOOT });
    }
    const moonlit = photoLook(0xFF172B49, 0xFF060D17, 0xB40C1A2C);
    function photo(id, label, photographer, day, dayFocus, nightFocus = dayFocus, bias = .24) {
        const placements = {};
        for (const f of FORMATS) placements[f.id] = { ...classicPlace(f), top: Math.max(148, f.safeTop + 80), right: f.width * (f.id === 'landscape' ? .58 : .77), bias, dayFocus, nightFocus };
        return { id, label, photographer, day, night: moonlit, arabic: 'bold', englishWeight: 600, placements };
    }

    const ARTWORKS = [
        {
            id: 'classic', label: 'Classic', classic: true, englishWeight: 500, arabic: null,
            day: look(0xFFFDFBF6, 0xFFF0E9DC, 0xFF1C1917, 0xFF7A716A, 0xFFA97E3C, 0x211C1917),
            night: look(0xFF171B2C, 0xFF090B15, 0xFFEDEAE4, 0xFFA2A7B8, 0xFFE0BD85, 0x29E7E5E4)
        },
        {
            // Minarets stand on the right; the narration takes the open sky to their left (below the moon at night).
            id: 'mosque', label: 'Mosque', arabic: 'naskh', englishWeight: 600, photographer: 'GLady',
            day: look(0xFF809AA7, 0xFFA19687, 0xFF111827, 0xFF2C3B4C, 0xFF5A4520, 0x40111827, { veil: 0x59F1F4F6, footScrim: 0xA610171A, ...FOOT }),
            night: look(0xFF122B47, 0xFF04162C, 0xFFFFFFFF, 0xFFC9D7E8, 0xFFF6E3B4, 0x40FFFFFF, { veil: 0x8C0A1E38, footScrim: 0xB3030B16, ...FOOT }),
            placements: {
                square: place(96, 240, 650, 800, { bias: .45, englishMax: 50, dayFocus: focus(.537, .5), nightFocus: focus(.496, .5) }),
                portrait: place(96, 150, 640, 700, { bias: .45, englishMax: 50, dayFocus: focus(.62, .5), nightFocus: focus(.59, .5) }),
                story: place(80, 250, 660, 900, { bias: .45, englishMax: 54, dayFocus: focus(.664, .5), nightFocus: focus(.639, .5) }),
                landscape: place(140, 250, 1080, 760, { bias: .45, dayFocus: focus(.5, .48), nightFocus: focus(.5, .435) })
            }
        },
        photo('mountain', 'Green valley', 'Daniel Angele', photoLook(0xFF617C53, 0xFF23371B, 0xC026351D), focus(.57, .47), focus(.56, .36)),
        {
            // A mosque on the far dune under the rising sun (a crescent at night); the upper-left sky is empty by design.
            id: 'desert', label: 'Desert', arabic: 'naskh', englishWeight: 600,
            day: look(0xFFF6E7CF, 0xFFC98F5F, 0xFF2B211C, 0xFF6B5446, 0xFF9A5A22, 0x402B211C, { veil: 0x33FFF6E8, footScrim: 0x8C3A1E10, ...FOOT }),
            night: look(0xFF131B40, 0xFF0A0D22, 0xFFF4F1EA, 0xFFC5C9E0, 0xFFF0C987, 0x40F4F1EA, { veil: 0x590A0E24, footScrim: 0x8C050612, ...FOOT }),
            placements: {
                square: place(96, 140, 640, 668, { bias: .3, englishMax: 48 }),
                portrait: place(96, 150, 560, 770, { bias: .3, englishMax: 48, dayFocus: focus(.58, .5) }),
                story: place(90, 220, 600, 1040, { bias: .3, englishMax: 52, dayFocus: focus(.60, .5) }),
                landscape: place(118, 150, 1000, 640, { bias: .35, englishMax: 58, dayFocus: focus(.5, .53) })
            }
        },
        photo('kaaba', 'Kaaba', 'Juned Khatri', photoLook(0xFF7195B9, 0xFF221D1B, 0xC4192635), focus(.45, .48), focus(.47, .48), .06),
        photo('sea', 'Sea', 'Linus Nylund', photoLook(0xFFBDB3D1, 0xFF1A6674, 0xBEDCD5EB, true), focus(.63, .48), focus(.44, .45), .10),
        photo('forest', 'Forest path', 'Lukáš Kulla', photoLook(0xFF755534, 0xFF2D2014, 0xBF2B2119), focus(.52, .48), focus(.50, .43)),
        photo('clouds', 'Clouds', 'Kenrick Mills', photoLook(0xFFEDD8CC, 0xFF456B70, 0xC4FAE4DC, true), focus(.59, .49), focus(.57, .44)),
        photo('misty_hills', 'Misty hills', 'Jonny Gios', photoLook(0xFFECC7A5, 0xFF475A6B, 0xC5DFE3E9, true), focus(.55, .44), focus(.55, .41)),
        photo('river_valley', 'River valley', 'Mario Álvarez', photoLook(0xFFA2A99E, 0xFF333D24, 0xC3293228), focus(.52, .51), focus(.54, .45))
    ];
    const artworkById = id => ARTWORKS.find(a => a.id === id) || ARTWORKS[0];
    const placementOf = (art, format) => (art.placements && art.placements[format.id]) || classicPlace(format);
    const artPath = (art, dark, thumb) => `card-art/${art.id}_${dark ? 'night' : 'day'}${thumb ? '_thumb' : ''}.webp`;

    /* Classic's own palette: halo, pattern and vignette over the gradient. */
    const CLASSIC = {
        light: { glow: 'rgba(169, 126, 60, 0.10)', vignette: 'rgba(120, 94, 55, 0.06)', pattern: '#a97e3c', patternAlpha: 0.03 },
        dark: { glow: 'rgba(224, 189, 133, 0.075)', vignette: 'rgba(0, 0, 0, 0.38)', pattern: '#e0bd85', patternAlpha: 0.035 }
    };

    const STATUS_COLORS = {
        sahih:   { light: '#15803d', dark: '#6ee7a8' },
        hasan:   { light: '#a16207', dark: '#fcd34d' },
        daif:    { light: '#b91c1c', dark: '#fca5a5' },
        unknown: { light: '#64748b', dark: '#a5b1bd' }
    };

    const MARGIN = 118;       // footer sides, and Classic text
    const CORNER = 72;        // top-corner badge and name
    const QUOTE_ROOM = 64;    // above a narration, for its opening quotation mark

    /* ---------- images and fonts ---------- */

    const images = new Map();
    function loadImage(src) {
        if (!images.has(src)) {
            images.set(src, new Promise(resolve => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => { images.delete(src); resolve(null); };
                img.src = src;
            }));
        }
        return images.get(src);
    }

    /**
     * Google Fonts splits each family into unicode-range subsets, and
     * document.fonts.load() defaults to loading whichever subset covers a
     * single space. The Arabic face therefore has to be requested with
     * actual Arabic text, or the canvas silently falls back to a system font.
     */
    function ensureFonts(sample, face) {
        if (!document.fonts || !document.fonts.load) return Promise.resolve();
        const latin = (sample && sample.english) || 'Hadith';
        const jobs = [
            ['700 40px "Cormorant Garamond"', '“'],
            ['600 40px "Cormorant Garamond"', latin],
            ['500 40px "Cormorant Garamond"', latin],
            ['500 24px "Inter"', latin],
            ['600 24px "Inter"', latin]
        ];
        if (sample && sample.arabic) jobs.push([`${face.weight} 40px ${face.family}`, sample.arabic]);
        return Promise.all(jobs.map(([spec, text]) => document.fonts.load(spec, text).catch(() => {}))).catch(() => {});
    }

    /* ---------- small canvas helpers ---------- */

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function trackedWidth(ctx, text, spacing) {
        const chars = Array.from(text);
        if (!chars.length) return 0;
        let total = 0;
        chars.forEach(c => { total += ctx.measureText(c).width + spacing; });
        return total - spacing;
    }

    function trackedAt(ctx, text, x, y, spacing) {
        const prevAlign = ctx.textAlign;
        ctx.textAlign = 'left';
        Array.from(text).forEach(c => {
            ctx.fillText(c, x, y);
            x += ctx.measureText(c).width + spacing;
        });
        ctx.textAlign = prevAlign;
    }

    function line(ctx, x1, y1, x2, y2, color, width) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    /* Pills: the grading, plus an "excerpt" marker when the text was cut. */
    const PILL_FONT = '600 21px "Inter", sans-serif';
    const PILL_H = 46;

    function drawPills(ctx, pills, anchorRight, top) {
        if (!pills.length) return 0;
        ctx.font = PILL_FONT;
        const gap = 14;
        const widths = pills.map(p => trackedWidth(ctx, p.label, 2.6) + (p.dot ? 72 : 52));
        const total = widths.reduce((a, b) => a + b, 0) + gap * (pills.length - 1);
        let x = anchorRight - total;

        pills.forEach((pill, i) => {
            const w = widths[i];
            ctx.save();
            ctx.fillStyle = pill.color;
            ctx.strokeStyle = pill.color;
            ctx.globalAlpha = 0.14;
            roundRect(ctx, x, top, w, PILL_H, PILL_H / 2);
            ctx.fill();
            ctx.globalAlpha = 0.45;
            ctx.lineWidth = 1.3;
            ctx.stroke();
            ctx.restore();

            ctx.fillStyle = pill.color;
            if (pill.dot) {
                ctx.beginPath();
                ctx.arc(x + 26, top + PILL_H / 2, 5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.font = PILL_FONT;
            trackedAt(ctx, pill.label, x + (pill.dot ? 44 : 26), top + PILL_H / 2 + 7.5, 2.6);
            x += w + gap;
        });
        return total;
    }

    function wrap(ctx, text, maxWidth) {
        const lines = [];
        text.split('\n').forEach(paragraph => {
            const words = paragraph.split(/\s+/).filter(Boolean);
            if (!words.length) return;
            let current = words[0];
            for (let i = 1; i < words.length; i++) {
                const candidate = current + ' ' + words[i];
                if (ctx.measureText(candidate).width <= maxWidth) {
                    current = candidate;
                } else {
                    lines.push(current);
                    current = words[i];
                }
            }
            lines.push(current);
        });
        return lines;
    }

    /** Shrinks the font until the wrapped text fits the box; truncates with an ellipsis at the smallest size. */
    function fitBlock(ctx, text, opts) {
        const { maxWidth, maxHeight, font, min, max, lineHeight } = opts;
        for (let size = max; size >= min; size -= 1) {
            ctx.font = font(size);
            const lines = wrap(ctx, text, maxWidth);
            const height = lines.length * size * lineHeight;
            if (height <= maxHeight) return { size, lines, height, lineHeight, font: font(size), truncated: false };
        }
        ctx.font = font(min);
        const lines = wrap(ctx, text, maxWidth);
        const keep = Math.max(1, Math.floor(maxHeight / (min * lineHeight)));
        const kept = lines.slice(0, keep);
        if (!kept.length) return { size: min, lines: [], height: 0, lineHeight, font: font(min), truncated: true };
        let last = kept[kept.length - 1];
        while (last.length && ctx.measureText(last + ' …').width > maxWidth) last = last.slice(0, -1);
        kept[kept.length - 1] = last.replace(/[\s,;:.]+$/, '') + ' …';
        return { size: min, lines: kept, height: kept.length * min * lineHeight, lineHeight, font: font(min), truncated: true };
    }

    function drawBlock(ctx, block, x, top, color, rtl) {
        // Draw with the font the text was measured in.
        ctx.save();
        ctx.font = block.font;
        ctx.fillStyle = color;
        ctx.direction = rtl ? 'rtl' : 'ltr';
        ctx.textAlign = rtl ? 'right' : 'left';
        ctx.textBaseline = 'alphabetic';
        const step = block.size * block.lineHeight;
        block.lines.forEach((text, i) => ctx.fillText(text, x, top + i * step + block.size * 0.78));
        ctx.restore();
    }

    function ellipsize(ctx, text, maxWidth) {
        if (ctx.measureText(text).width <= maxWidth) return text;
        let out = text;
        while (out.length > 1 && ctx.measureText(out + '…').width > maxWidth) out = out.slice(0, -1);
        return out.trim() + '…';
    }

    /* ---------- layout (Android layoutCard) ---------- */

    function layoutCard(ctx, data, face, englishWeight, p) {
        const english = (data.english || '').trim();
        const arabic = (data.arabic || '').trim();
        const narrator = (data.narrator || '').trim();
        const hasReference = Boolean(data.collectionTitle || data.ref);
        const innerWidth = p.right - p.left;

        const narratorH = narrator ? 50 : 0;
        const arabicOnly = !english && Boolean(arabic);
        const arabicGap = arabic && !arabicOnly ? 64 : 0;
        const band = (hasReference ? p.bottom : p.bottom + 148) - p.top;
        let available = band - narratorH - arabicGap;
        const arabicFont = s => `${face.weight} ${s}px ${face.family}`;

        let arabicBlock = null;
        if (arabicOnly) {
            // Arabic is the whole card: it takes the full band and is never dropped.
            arabicBlock = fitBlock(ctx, arabic, { maxWidth: innerWidth, maxHeight: available, font: arabicFont, min: face.min, max: face.max, lineHeight: face.lineHeight });
            available -= arabicBlock.height;
        } else if (arabic) {
            const block = fitBlock(ctx, arabic, { maxWidth: innerWidth, maxHeight: available * (english.length > 280 ? 0.32 : 0.40), font: arabicFont, min: face.min, max: face.max, lineHeight: face.lineHeight });
            // An Arabic text that had to be cut to one line is worse than none at all.
            if (block.truncated && block.lines.length < 2) available = band - narratorH;
            else { arabicBlock = block; available -= block.height; }
        }

        const englishBlock = fitBlock(ctx, english, {
            maxWidth: innerWidth, maxHeight: available,
            font: s => `${englishWeight} ${s}px "Cormorant Garamond", Georgia, serif`,
            min: p.englishMin, max: p.englishMax, lineHeight: 1.48
        });
        const totalH = (arabicBlock ? arabicBlock.height + arabicGap : 0) + englishBlock.height + narratorH;
        return { arabicBlock, englishBlock, arabicGap, totalH, startY: p.top + Math.max(0, (band - totalH) * p.bias) };
    }

    /* ---------- backgrounds ---------- */

    function drawClassicBackground(ctx, l, c, w, h) {
        const reach = Math.max(w, h) * 0.8;
        const g = ctx.createLinearGradient(0, 0, w * 0.3, h);
        g.addColorStop(0, l.bgFrom);
        g.addColorStop(1, l.bgTo);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);

        const halo = ctx.createRadialGradient(w / 2, h * 0.34, 0, w / 2, h * 0.34, reach);
        halo.addColorStop(0, c.glow);
        halo.addColorStop(40 / 864, c.glow);
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(0, 0, w, h);

        // A faint grid of eight-point stars (two overlapping squares).
        ctx.save();
        ctx.globalAlpha = c.patternAlpha;
        ctx.strokeStyle = c.pattern;
        ctx.lineWidth = 1.4;
        for (let y = 54; y < h; y += 108) {
            for (let x = 54; x < w; x += 108) {
                for (let k = 0; k < 2; k++) {
                    ctx.save();
                    ctx.translate(x, y);
                    ctx.rotate(k * Math.PI / 4);
                    ctx.strokeRect(-21, -21, 42, 42);
                    ctx.restore();
                }
            }
        }
        ctx.restore();

        const v = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, reach);
        v.addColorStop(0, 'rgba(0,0,0,0)');
        v.addColorStop(453.6 / 864, 'rgba(0,0,0,0)');
        v.addColorStop(1, c.vignette);
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = l.rule;
        ctx.lineWidth = 1.6;
        roundRect(ctx, 46, 46, w - 92, h - 92, 30);
        ctx.stroke();
    }

    function drawArtworkBackground(ctx, img, l, f, w, h) {
        if (img) {
            // Cover the card without stretching, keeping the focus point as near the centre as the edges allow.
            const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
            const cw = Math.min(w / scale, img.naturalWidth);
            const ch = Math.min(h / scale, img.naturalHeight);
            const x = Math.min(Math.max(f.x * img.naturalWidth - cw / 2, 0), img.naturalWidth - cw);
            const y = Math.min(Math.max(f.y * img.naturalHeight - ch / 2, 0), img.naturalHeight - ch);
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, x, y, cw, ch, 0, 0, w, h);
        } else {
            const g = ctx.createLinearGradient(0, 0, w * 0.25, h);
            g.addColorStop(0, l.bgFrom);
            g.addColorStop(1, l.bgTo);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        }
    }

    /** A blurred patch of the sky's own colour behind the narration: invisible over open sky, haze over rock or cloud. */
    function drawVeil(ctx, color, p, layout) {
        if (!color || layout.totalH <= 0) return;
        const off = 10000; // the shape is drawn off-canvas and only its blurred shadow lands on the card
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 105; // Android BlurMaskFilter radius 90
        ctx.shadowOffsetX = off;
        ctx.fillStyle = '#000';
        roundRect(ctx, p.left - 40 - off, layout.startY - 90, p.right - p.left + 80, layout.totalH + 150, 80);
        ctx.fill();
        ctx.restore();
    }

    /** A dark band behind the reference row only. */
    function drawFootScrim(ctx, scrim, w, h) {
        if (!scrim) return;
        const top = h - 340;
        const at = y => (y - top) / (h - top);
        const g = ctx.createLinearGradient(0, top, 0, h);
        g.addColorStop(0, argb(scrim & 0x00FFFFFF));
        g.addColorStop(at(h - 200), argb(scrim));
        g.addColorStop(at(h - 40), argb(scrim));
        g.addColorStop(1, argb(scrim));
        ctx.fillStyle = g;
        ctx.fillRect(0, top, w, h - top);
    }

    /* ---------- the card ---------- */

    /**
     * @param {Object} data  { english, arabic, narrator, collectionTitle, ref, primary, excerpt, site }
     * @param {Object} options  { theme: 'light'|'dark', artwork: id, format: id }
     * @returns {Promise<HTMLCanvasElement>}
     */
    async function render(data, options = {}) {
        const dark = options.theme === 'dark';
        const art = artworkById(options.artwork);
        const format = formatById(options.format);
        const l = dark ? art.night : art.day;
        const w = format.width, h = format.height;
        const face = ARABIC[art.arabic || 'clear'];

        const [, img, logo, playIcon] = await Promise.all([
            ensureFonts(data, face),
            art.classic ? null : loadImage(artPath(art, dark)),
            loadImage('card-art/logo.png'),
            loadImage('card-art/google_play_icon.png')
        ]);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'alphabetic';

        const quoted = Boolean((data.english || '').trim());
        const base = placementOf(art, format);
        const p = quoted ? { ...base, top: base.top + QUOTE_ROOM } : base;
        const layout = layoutCard(ctx, data, face, art.englishWeight, p);

        if (art.classic) {
            drawClassicBackground(ctx, l, CLASSIC[dark ? 'dark' : 'light'], w, h);
        } else {
            drawArtworkBackground(ctx, img, l, dark ? p.nightFocus : p.dayFocus, w, h);
            if (l.veil) drawVeil(ctx, argb(l.veil, dark ? 1 : 0.55), p, layout);
            drawFootScrim(ctx, l.footScrim, w, h);
        }

        const footText = l.footText || l.text, footMuted = l.footMuted || l.muted, footRule = l.footRule || l.rule;
        const footRight = w - MARGIN;
        const dy = h - 1080;

        /* --- top corners: the app's mark and name on the right, where to get it on the left --- */
        const cornerRight = w - CORNER;
        const pillBehind = l.veil ? argb((l.veil & 0x00FFFFFF) | 0x99000000) : null;
        ctx.font = '600 25px "Inter", sans-serif';
        const nameWide = ctx.measureText('Hadith Pull').width;
        const tile = { left: cornerRight - nameWide - 14 - 48, top: 58, right: cornerRight - nameWide - 14, bottom: 106 };
        if (pillBehind) {
            ctx.fillStyle = pillBehind;
            roundRect(ctx, tile.left - 10, tile.top - 10, cornerRight + 16 - (tile.left - 10), tile.bottom - tile.top + 20, 22);
            ctx.fill();
        }
        if (logo) {
            ctx.save();
            roundRect(ctx, tile.left, tile.top, 48, 48, 12);
            ctx.clip();
            ctx.drawImage(logo, tile.left, tile.top, 48, 48);
            ctx.restore();
        }
        ctx.fillStyle = l.text;
        ctx.textAlign = 'left';
        ctx.font = '600 25px "Inter", sans-serif';
        ctx.fillText('Hadith Pull', cornerRight - nameWide, 91);

        ctx.font = '600 22px "Inter", sans-serif';
        const googlePlayWide = ctx.measureText('Google Play').width;
        ctx.font = '600 11.5px "Inter", sans-serif';
        const storeWide = Math.max(googlePlayWide, trackedWidth(ctx, 'GET IT ON', 1.6));
        const mark = { left: CORNER, top: 61, right: CORNER + 38, bottom: 103 };
        if (pillBehind) {
            ctx.fillStyle = pillBehind;
            roundRect(ctx, CORNER - 16, tile.top - 10, mark.right + 12 + storeWide + 18 - (CORNER - 16), tile.bottom - tile.top + 20, 22);
            ctx.fill();
        }
        if (playIcon) {
            const markH = mark.bottom - mark.top;
            ctx.drawImage(playIcon, mark.left, mark.top, markH * playIcon.naturalWidth / playIcon.naturalHeight, markH);
        }
        ctx.fillStyle = l.text;
        ctx.font = '600 11.5px "Inter", sans-serif';
        trackedAt(ctx, 'GET IT ON', mark.right + 12, 76, 1.6);
        ctx.font = '600 22px "Inter", sans-serif';
        ctx.fillText('Google Play', mark.right + 12, 100);

        /* --- the website, bottom left behind a small globe --- */
        const siteY = 1002 + dy;
        const gx = MARGIN + 15, gy = siteY - 7;
        ctx.strokeStyle = footText;
        ctx.lineWidth = 1.9;
        ctx.beginPath(); ctx.ellipse(gx, gy, 14, 14, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(gx, gy, 6.5, 14, 0, 0, Math.PI * 2); ctx.stroke();
        line(ctx, gx - 14, gy, gx + 14, gy, footText, 1.9);
        for (const side of [-1, 1]) line(ctx, gx - 11.8, gy + side * 7.5, gx + 11.8, gy + side * 7.5, footText, 1.9);
        ctx.fillStyle = footMuted;
        ctx.font = '500 20px "Inter", sans-serif';
        trackedAt(ctx, (data.site || 'hadithpull.online').toUpperCase(), gx + 14 + 12, siteY, 3.4);
        if (art.photographer) {
            ctx.font = '500 23px "Inter", sans-serif';
            ctx.textAlign = 'right';
            ctx.fillStyle = footText;
            ctx.fillText(`${dark ? 'Original photo by' : 'Photo by'} ${art.photographer}`, footRight, siteY);
            ctx.textAlign = 'left';
        }

        /* --- the narration --- */
        let y = layout.startY;
        if (quoted) {
            ctx.font = '700 150px "Cormorant Garamond", Georgia, serif';
            ctx.fillStyle = l.accent;
            ctx.fillText('“', p.left - 6, y + 44); // the glyph sits high in its em box
        }
        if (layout.arabicBlock) {
            drawBlock(ctx, layout.arabicBlock, p.right, y, l.text, true);
            y += layout.arabicBlock.height;
            if (layout.arabicGap > 0) {
                y += layout.arabicGap * 0.45;
                line(ctx, p.left, y, p.left + 88, y, l.rule, 1.3);
                y += layout.arabicGap * 0.55;
            }
        }
        drawBlock(ctx, layout.englishBlock, p.left, y, l.text, false);
        y += layout.englishBlock.height;

        const narrator = (data.narrator || '').trim();
        if (narrator) {
            // A short rule, then the narrator in small tracked capitals: who is speaking, set apart from what was said.
            line(ctx, p.left, y + 16, p.left + 56, y + 16, l.accent, 2);
            ctx.font = '600 19px "Inter", sans-serif';
            let name = narrator.toUpperCase();
            while (name.length > 3 && trackedWidth(ctx, name, 2.2) > p.right - p.left) name = name.slice(0, -2).trimEnd() + '…';
            ctx.fillStyle = l.accent;
            trackedAt(ctx, name, p.left, y + 48, 2.2);
        }

        /* --- reference: source on the left, grading on the right --- */
        if (data.collectionTitle || data.ref) {
            line(ctx, MARGIN, 848 + dy, footRight, 848 + dy, footRule, 1.3);
            const pills = [];
            const primary = data.primary || null;
            if (primary && (primary.grade || '').trim()) {
                const colors = STATUS_COLORS[primary.cat] || STATUS_COLORS.unknown;
                pills.push({ label: primary.grade.trim().toUpperCase(), color: dark || l.footOnDark ? colors.dark : colors.light, dot: true });
            }
            // Be honest when the narration is not here in full.
            if (data.excerpt || layout.englishBlock.truncated || (!quoted && layout.arabicBlock && layout.arabicBlock.truncated)) {
                pills.push({ label: 'EXCERPT', color: footMuted, dot: false });
            }
            const pillsWide = drawPills(ctx, pills, footRight, 894 + dy);

            // Shrink the reference to fit beside the pills, then cut the collection name, never the number.
            const refRoom = footRight - MARGIN - (pillsWide ? pillsWide + 30 : 0);
            const numberPart = data.ref ? '  ·  Hadith ' + data.ref : '';
            const refText = (data.collectionTitle || '') + numberPart;
            let refSize = 31;
            ctx.font = `600 ${refSize}px "Inter", sans-serif`;
            while (refSize > 25 && ctx.measureText(refText).width > refRoom) {
                refSize -= 1;
                ctx.font = `600 ${refSize}px "Inter", sans-serif`;
            }
            const bookPart = ellipsize(ctx, data.collectionTitle || '', refRoom - ctx.measureText(numberPart).width);
            ctx.fillStyle = footText;
            ctx.textAlign = 'left';
            ctx.fillText(bookPart + numberPart, MARGIN, 928 + dy);
        }

        return canvas;
    }

    return { render, ARTWORKS, FORMATS, artworkById, formatById, thumbPath: (art, dark) => art.classic ? null : artPath(art, dark, true) };
})();
