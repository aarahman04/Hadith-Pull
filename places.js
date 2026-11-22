/* Place looks (Book, Sea, Bab, Court, Oasis, Hira): the scene behind the pages, the frame the narration is read in,
   and what the place does when the light, the look, the narration or the screen changes.
   The drawing is ported from Android ui/components/LookScenes.kt and ui/reader/ReadingPlaces.kt in the same units,
   the motion from ui/reader/PlaceTurns.kt and MainActivity.kt. Edit both platforms together. */
const Places = (() => {
// A widget shows the narration on the look's plain page: no scene, no frame.
if (document.documentElement.classList.contains('widget')) return { turn() {}, sunset: () => false, change: (name, apply) => apply(), through: fn => fn(), busy: () => false };
let PHONE = false;

const PAGE = 220, WORLD = 1100;
// The website draws one screen more at each end, so the place runs past both edges of a wide window.
const L = -PAGE, R = WORLD + PAGE;
// The tabs are a loop (paintTile): after About's screen comes one more, and then Read again. ROUND is the length of
// that loop, so x and x - ROUND are the same place.
const ROUND = WORLD + PAGE;
const ease = t => t * t * (3 - 2 * t);
/** A line along the place that comes round to its own start: across the screen after About it bends from where About
    leaves it to where Read begins. */
const round = f => x => x <= WORLD ? f(x) : f(x) + (f(x - ROUND) - f(x)) * ease(min(1, (x - WORLD) / PAGE));
/** Draws [draw] over the screen after About, coming up from nothing at About's edge to whole at Read's. */
function arriving(h, draw) {
  // Drawn whole on a layer of its own, then faded in by one smooth mask: slices of it showed as stripes.
  const into = X, layer = document.createElement('canvas');
  layer.width = into.canvas.width; layer.height = into.canvas.height;
  X = layer.getContext('2d'); X.setTransform(into.getTransform());
  clipped(WORLD, -50, ROUND - WORLD + 20, h + 100, draw);
  X.globalCompositeOperation = 'destination-in';
  box(grad(WORLD, 0, ROUND, 0, Array.from({ length: 11 }, (_, k) => [k / 10, BLACK.a(ease(k / 10))])), WORLD, -50, ROUND - WORLD + 20, h + 100);
  X = into;
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.drawImage(layer, 0, 0); X.restore();
}
const { sin, sqrt, abs, exp, PI, ceil, max, min, acos } = Math;
let X; // the 2D context being drawn into

class Col {
  constructor(r, g, b, al = 1) { this.r = r; this.g = g; this.b = b; this.al = al; }
  a(al) { return new Col(this.r, this.g, this.b, al); }
  toString() { return `rgba(${this.r},${this.g},${this.b},${this.al})`; }
}
const H = (s, al = 1) => new Col(parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16), al);
const lerp = (p, q, t) => new Col(Math.round(p.r + (q.r - p.r) * t), Math.round(p.g + (q.g - p.g) * t), Math.round(p.b + (q.b - p.b) * t), p.al + (q.al - p.al) * t);
const WHITE = H('FFFFFF'), BLACK = H('000000'), CLEAR = new Col(0, 0, 0, 0);

// A port of kotlin.random.Random(seed), meant to put houses, stars and rock where Android does. Not yet checked against the app.
function Rand(seed) {
  let x = seed | 0, y = seed >> 31, z = 0, w = 0, v = ~seed, add = (seed << 10) ^ (y >>> 4);
  const next = () => { let t = x; t ^= t >>> 2; x = y; y = z; z = w; const v0 = v; w = v0; t = (t ^ (t << 1)) ^ v0 ^ (v0 << 4); v = t; add = (add + 362437) | 0; return (t + add) | 0; };
  for (let i = 0; i < 64; i++) next();
  return () => (next() >>> 8) / 16777216;
}

const P2 = d => d instanceof Path2D ? d : new Path2D(d);
const box = (c, x, y, w, h) => { X.fillStyle = c; X.fillRect(x, y, w, h); };
const fill = (d, c) => { X.fillStyle = c; X.fill(P2(d)); };
const line = (d, c, w, cap = 'butt') => { X.strokeStyle = c; X.lineWidth = w; X.lineCap = cap; X.stroke(P2(d)); };
const seg = (c, x1, y1, x2, y2, w, cap) => { const p = new Path2D; p.moveTo(x1, y1); p.lineTo(x2, y2); line(p, c, w, cap); };
const disc = (c, r, x, y) => { X.fillStyle = c; X.beginPath(); X.arc(x, y, r, 0, 7); X.fill(); };
const ring = (c, r, x, y, w) => { X.strokeStyle = c; X.lineWidth = w; X.beginPath(); X.arc(x, y, r, 0, 7); X.stroke(); };
const oval = (c, x, y, w, h) => { X.fillStyle = c; X.beginPath(); X.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 7); X.fill(); };
const edge = (c, x, y, w, h, lw) => { X.strokeStyle = c; X.lineWidth = lw; X.strokeRect(x, y, w, h); };
const at = (x, y, sx, sy, f) => { X.save(); X.translate(x, y); X.scale(sx, sy); f(); X.restore(); };
const put = (d, c, x, y, s = 1, flip = false) => at(x, y, flip ? -s : s, s, () => fill(d, c));
const clipped = (x, y, w, h, f) => { X.save(); X.beginPath(); X.rect(x, y, w, h); X.clip(); f(); X.restore(); };
const stops = (q, list) => { list.forEach((s, i) => Array.isArray(s) ? q.addColorStop(s[0], s[1]) : q.addColorStop(i / (list.length - 1), s)); return q; };
const grad = (x0, y0, x1, y1, list) => stops(X.createLinearGradient(x0, y0, x1, y1), list);
const glow = (cx, cy, r, list) => stops(X.createRadialGradient(cx, cy, 0, cx, cy, r), list);

const nightStars = (() => { const r = Rand(7); return Array.from({ length: 46 }, () => [r(), r(), 0.4 + r() * 0.7]); })();
function stars(depth, width = PAGE, fade = 1, lane = null) {
  const color = H('FFF6DE');
  for (let x0 = 0, flip = false; x0 < width; x0 += PAGE, flip = !flip)
    for (const [x, y, r] of nightStars) if (!lane || y * depth < lane[0] || y * depth > lane[1]) disc(color.a((0.35 + r * 0.5) * fade), r, x0 + (flip ? 1 - x : x) * PAGE, y * depth);
}

/** The sun, or the crescent moon in its halo. No star beside it. */
function skyBody(sun, cx, cy, low = 0) {
  if (sun) {
    const face = lerp(H('FFF3C9'), H('FF9A4A'), low);
    disc(face.a(0.35), 15, cx, cy); disc(face, 9, cx, cy);
  } else {
    const light = H('F7EFD2');
    disc(glow(cx, cy, 20, [light.a(0.22), light.a(0)]), 20, cx, cy);
    X.save(); const p = new Path2D; p.rect(cx - 30, cy - 30, 60, 60); p.arc(cx - 4.4, cy - 2.6, 8, 0, 7); X.clip(p, 'evenodd'); disc(light, 9, cx, cy); X.restore();
  }
}

function vineBand(x, y, width, height, gold, berry) {
  const s = height / 20;
  clipped(x, y, width, height, () => at(x, y, s, s, () => {
    for (let i = 0; i < ceil(width / (40 * s)); i++) { X.save(); X.translate(i * 40, 0); line("M0 10C10 0 10 20 20 10S30 0 40 10", gold, 1.3); fill("M10 5q4-5 8 0q-4 3-8 0zM30 15q4 5 8 0q-4-3-8 0z", gold); disc(berry, 1.8, 20, 10); X.restore(); }
  }));
}

function saduBand(x, y, width, height, red = H('A9322A'), black = H('1E1A17'), cream = H('F4E8CF')) {
  const s = height / 12;
  clipped(x, y, width, height, () => {
    box(red, x, y, width, height);
    at(x, y, s, s, () => {
      for (let i = 0; i < ceil(width / (16 * s)); i++) { X.save(); X.translate(i * 16, 0); fill("M0 12L8 2L16 12Z", black); fill("M4 12L8 7L12 12Z", cream); X.restore(); }
      box(cream, 0, 0, width / s, 1.6);
    });
  });
}

const CAMEL = "M2 0L3 -12C3 -16 5 -17 7 -18C10 -24 16 -25 19 -19C22 -18 25 -18 27 -20L29 -26C30 -29 33 -29 35 -28L38 -26L35 -25L33 -24L31 -17C31 -13 28 -11 26 -11L27 0L25 0L23 -10L11 -10L9 0L7 0L7 -10L5 -11L4 0Z";
const TENT = "M0 0L8 -18L22 -26L36 -18L44 0Z";
const FISH = "M0 0q4-3 8 0q-4 3-8 0zM8 0l3-2v4z";

function palm(x, y, height, lean, s, trunk, leaf, date = H('B5553A')) {
  at(x, y, s, s, () => {
    const stem = new Path2D; stem.moveTo(0, 0); stem.quadraticCurveTo(lean, -height / 2, lean * 1.6, -height);
    line(stem, trunk, 3.2, 'round');
    X.translate(lean * 1.6, -height);
    for (const a of [-150, -120, -95, -70, -45, -20, 10, -175]) { X.save(); X.rotate(a * PI / 180); fill("M0 0Q14 -9 30 2Q14 -3 0 0Z", leaf); X.restore(); }
    disc(date, 2.6, 0, 0);
  });
}

/** A soft clearing in a skyline under the header, so the page's title reads over it. */
function clearing(bg, band, strength) {
  const cx = 110, cy = band + 36;
  X.save(); X.translate(cx, cy); X.scale(1.7, 1); X.translate(-cx, -cy);
  disc(glow(cx, cy, 44, [[0, bg.a(strength)], [0.6, bg.a(strength * 0.83)], [1, bg.a(0)]]), 44, cx, cy);
  X.restore();
}

const aside = x => abs(((x % PAGE) + PAGE) % PAGE - 110) / 110;

function spikes(seed, from, to, y, down, color, long, edgesOnly = false) {
  const r = Rand(seed);
  let x = from;
  while (x < to) {
    const w = 8 + r() * 16, e = aside(x + w / 2), len = (6 + r() * long) * (0.25 + e * 0.9), tip = 0.35 + r() * 0.3;
    if (!edgesOnly || e > 0.55) { const p = new Path2D; p.moveTo(x, y); p.lineTo(x + w * tip, down ? y + len : y - len); p.lineTo(x + w, y); p.closePath(); fill(p, color); }
    x += w * 0.8;
  }
}

/** The open book: one leaf [W] wide. On the website the leaf is as wide as the window, its binding at both edges. */
function openBook(c, night, band, h, page, W) {
  const leather = H(night ? '2B170E' : '5A2E1A');
  if (night) box(glow(W / 2, band, 240, [c.bgTintA, CLEAR]), 0, 0, W, h);
  const m = 13 / W;
  box(grad(0, 0, W, 0, [[0, leather.a(0.45)], [m, leather.a(0)], [1 - m, leather.a(0)], [1, leather.a(0.45)]]), 0, 0, W, h);
  box(leather, 0, 0, 5, h); box(leather, W - 5, 0, 5, h);
  box(c.chrome, 5, 0, W - 10, band);
  // A desktop header is shallower than a phone's bar, so the vine is a narrow border under the tabs.
  if (PHONE) vineBand(5, band - 9, W - 10, 8, c.gold, c.highlight); else vineBand(5, band - 4.5, W - 10, 4, c.gold, c.highlight);
  box(c.gold, 5, band, W - 10, 2.5);
  if (page > 0) {
    const x = page % 2 === 1 ? 5 : W - 5;
    for (let i = 0; i < 3; i++) {
      const cy = band + 60 + i * 130 + page * 19;
      seg(c.gold, x, cy - 9, x, cy + 9, 0.8);
      disc(c.chrome, 5, x, cy); ring(c.gold, 5, x, cy, 1); disc(i === page % 3 ? c.highlight : c.gold, 2.2, x, cy);
    }
  }
}

function waterWall(cx, half, top, h, deep, mid, foam, seed) {
  const right = y => cx + half + 3.5 * sin(y / 37 + seed) + 1.6 * sin(y / 13 + seed * 1.7);
  const left = y => cx - half - 3.5 * sin(y / 41 + seed * 2.3) - 1.6 * sin(y / 11 + seed);
  const body = new Path2D; body.moveTo(left(top), top);
  let y = top;
  while (y <= h) { body.lineTo(right(y), y); y += 6; }
  while (y >= top) { body.lineTo(left(y), y); y -= 6; }
  body.closePath();
  fill(body, grad(cx - half - 5, 0, cx + half + 5, 0, [mid, deep, mid]));
  for (let i = -1; i <= 1; i++) {
    const p = new Path2D; let y = top + 20; p.moveTo(cx + i * half * 0.5, y);
    while (y <= h) { p.lineTo(cx + i * half * 0.5 + 2 * sin(y / 23 + i + seed), y); y += 8; }
    line(p, WHITE.a(0.10), 1.2);
  }
  for (const side of [left, right]) {
    const p = new Path2D; let y = top; p.moveTo(side(y), y);
    while (y <= h) { p.lineTo(side(y), y); y += 6; }
    line(p, foam, 1.5);
  }
  oval(mid, cx - half - 4, top - 8, half * 2 + 8, 18);
  for (const dir of [-1, 1]) at(cx + dir * (half + 1), top + 2, dir, 1, () => {
    fill("M-6 8C-4 -8 12 -12 17 -1C18 5 12 8 9 4C10 0 6 -2 3 2C1 5 0 8 -6 8Z", mid);
    line("M-4 4C-2 -8 12 -11 16 -1C17 4 12 7 9 4", foam, 1.3);
    for (const [dx, dy, r] of [[19, -6, 1], [22, 0, 0.8], [15, -11, 0.8], [24, -9, 0.6]]) disc(foam, r, dx, dy);
  });
  const arc = new Path2D; arc.moveTo(cx - half - 2, top); arc.quadraticCurveTo(cx, top - 11, cx + half + 2, top);
  line(arc, foam, 1.3);
}

function ridge(from, to, foot, tall, seed, peak = null) {
  const p = new Path2D; p.moveTo(from, foot);
  for (let x = from, i = 0; x <= to + 20; x += i % 2 === 0 ? 13 : 21, i++) {
    const rise = min(max((x - from) / 90, 0), 1);
    let y = tall * (0.45 + 0.35 * sin(x / 31 + seed) + 0.2 * sin(x / 12 + seed * 2)) * rise;
    if (peak != null) y += 34 * exp(-((x - peak) / 26) * ((x - peak) / 26));
    p.lineTo(x, foot - max(y, 0));
  }
  p.lineTo(to + 20, foot); p.closePath();
  return p;
}

/* Website only (owner, 18 November): Read and Categories had the same path between the same walls. Further in, on
   Categories, the sea floor shows: weed at the foot of each wall and shells and pebbles on the wet sand. */
function seabed(c, night, h, deep, mid) {
  const r = Rand(41), weed = lerp(mid, deep, 0.35).a(night ? 0.7 : 0.8), stone = lerp(c.bg, c.text, 0.22).a(0.5), shell = lerp(c.bg, H('C0603A'), 0.45);
  for (let y = 70; y < h; y += 34 + r() * 30) for (const [x, dir] of [[236, 1], [424, -1]]) {
    const tall = 9 + r() * 10, p = new Path2D;
    for (let k = 0; k < 3; k++) { const x0 = x + dir * k * 2.4, sway = dir * (2 + r() * 3); p.moveTo(x0, y); p.quadraticCurveTo(x0 + sway, y - tall / 2, x0 + dir * 1.5, y - tall + k * 2); }
    line(p, weed, 1.4, 'round');
  }
  for (let i = 0; i < 26; i++) {
    const side = i % 2, x = side ? 392 + r() * 22 : 246 + r() * 22, y = 80 + r() * (h - 120);
    if (i % 5 === 0) at(x, y, 1, 1, () => { fill('M-3 0Q0 -4 3 0Z', shell); line('M0 0L-1.4 -2.2M0 0L0 -2.6M0 0L1.4 -2.2', stone, 0.5); });
    else oval(stone, x, y, 1.6 + r() * 2.2, 1.1 + r() * 1.2);
  }
}

function sea(c, night, band, h) {
  const deep = H(night ? '0A3140' : '1C8FA6'), mid = H(night ? '14586C' : '58BCCB'), foam = WHITE.a(night ? 0.55 : 0.9);
  // The light down the path, its whole circle (cut at Read's edge it showed as a step in the sky), and again where the loop reaches Read.
  for (const x0 of [0, ROUND]) box(glow(x0 + 220, band + 6, 230, [c.bgTintA, CLEAR]), x0 - 10, 0, 460, band + 250);
  for (let page = L / PAGE; page < R / PAGE; page++) for (let i = 0; i < 5; i++) {
    const y = h - 110 - i * 62, p = new Path2D;
    p.moveTo(page * PAGE + 40 + i * 9, y); p.quadraticCurveTo(page * PAGE + 110, y - 6, page * PAGE + 180 - i * 7, y);
    line(p, c.text.a(0.07), 1);
  }
  const shore = band + 55;
  const water = new Path2D; water.moveTo(440, band + 20); water.quadraticCurveTo(464, band + 24, 488, shore);
  // A phone ends the water at the edge of its screen. A wide window shows that end, so there it laps onto the sand.
  if (PHONE) { water.lineTo(660, shore); water.lineTo(660, shore + 11); } else { water.lineTo(640, shore); water.quadraticCurveTo(672, shore + 1, 680, shore + 11); } water.lineTo(440, shore + 11); water.closePath();
  fill(water, grad(0, band + 20, 0, shore + 11, [mid, deep]));
  const surf = new Path2D; surf.moveTo(440, shore + 11);
  for (let i = 0; i <= 10; i++) surf.quadraticCurveTo(440 + i * 20 + 10, shore + 8 + (i % 2) * 5, 440 + (i + 1) * 20, shore + 11);
  if (!PHONE) surf.quadraticCurveTo(680, shore + 8, 686, shore + 12);
  surf.lineTo(PHONE ? 660 : 682, shore + 15); surf.lineTo(440, shore + 15); surf.closePath();
  fill(surf, foam);
  for (let i = 0; i < 4; i++) {
    const y = shore + 3 + (i % 2) * 4, p = new Path2D;
    p.moveTo(496 + i * 38, y); p.quadraticCurveTo(508 + i * 38, y - 2.5, 520 + i * 38, y);
    line(p, foam.a(foam.al * 0.6), 0.9);
  }
  // The range first, so the walls of water stand in front of it; Read's first wall stands again at ROUND, where the
  // loop comes back to Read, and the range ends behind it.
  seaRange(c, night, band);
  [[0, 0], [220, 1], [440, 2], [ROUND, 0]].forEach(([cx, i]) => {
    waterWall(cx, 15, band + 20, h, deep, mid, foam, i * 3 + 1);
    for (let f = 0; f < 4; f++) put(FISH, foam.a(foam.al * 0.4), cx - 9 + (f % 2) * 10, band + 110 + f * 96 + i * 30, 0.7, f % 2 === 1);
  });
  seabed(c, night, h, deep, mid);
}

/** The mountain past the shore. In the tabs' loop the screen after About is the one before Read, so the range goes on
    there too and ends behind Read's first wall of water (owner, 18 November). */
function seaRange(c, night, band) {
  const far = lerp(c.bg, H(night ? '2A3350' : 'B98F7A'), 0.5), near = lerp(c.bg, H(night ? '1B2238' : '9C6F58'), 0.55);
  disc(glow(1038, band + 16, 50, [H('FFE9B0', 0.9), H('FFE9B0', 0)]), 50, 1038, band + 16);
  fill(ridge(590, R, band + 70, 40, 1.3, 1038), far);
  fill(ridge(650, R, band + 70, 22, 4.1), near);
  box(near, 650, band + 70, R - 650, 2);
  // The range's shade on the sand comes in gradually where the range begins.
  for (let i = 0; i < 25; i++) box(grad(0, band + 72, 0, band + 110, [near.a(0.6 * (i + 1) / 25), near.a(0)]), 650 + i * 2, band + 72, 2.05, 38);
  box(grad(0, band + 72, 0, band + 110, [near.a(0.6), near.a(0)]), 700, band + 72, R - 700, 38);
}

function house(x, w, top, foot, wall, shade, lit, door) {
  box(wall, x, top, w, foot - top);
  box(shade.a(0.5), x, top, w, 1.4);
  for (let i = 0; i < Math.floor(w / 7); i++) disc(shade.a(0.6), 0.8, x + 4 + i * 7, top + 5);
  if (foot - top > 18) box(lit || shade, x + w * 0.3, top + 10, 3, 5);
  if (door && foot - top > 14) {
    const dx = x + w * 0.6, p = new Path2D;
    p.moveTo(dx, foot); p.lineTo(dx, foot - 8); p.arc(dx + 3, foot - 8, 3, PI, 2 * PI); p.lineTo(dx + 6, foot); p.closePath();
    fill(p, shade);
  }
}

function city(c, night, band, h) {
  const walls = (night ? ['2E231A', '271D15', '332719'] : ['E9D7B2', 'DDC79E', 'D1B98C']).map(s => H(s));
  const shade = H(night ? '120C08' : '8C7350'), lit = H('F2C06A'), trunk = H(night ? '1D150F' : '7A5522'), leaf = H(night ? '1F4A33' : '2F7A48');
  const foot = band + 66;
  // The street, lit from above along its whole length (lit a screen at a time it showed an edge at every screen).
  box(grad(0, foot, 0, h, [[0, night ? c.bgTintA.a(0.12) : H('FFF3D0', 0.5)], [0.6, CLEAR], [1, H('5A4030', 0.16)]]), PAGE, foot, R - PAGE, h - foot);
  const r = Rand(17);
  for (let x = 228, n = 0; x < R; n++) {
    const w = 24 + r() * 22, market = x >= 430 && x <= 650, mosque = x >= 668 && x <= 872;
    const tall = market ? 12 + r() * 12 : 22 + r() * 30;
    const top = foot - tall * (0.55 + 0.45 * aside(x + w / 2));
    if (!mosque) {
      if (n % 3 === 1 && !market) palm(x - 2, foot, 58, n % 2 === 0 ? 5 : -5, 0.5, trunk, leaf);
      house(x, w, top, foot, walls[n % 3], shade, night && n % 2 === 0 ? lit : null, n % 2 === 0);
    }
    x += w;
  }
  const cloths = ['A9322A', '2F7A48', '1F5F8A'].map(s => H(s));
  for (let i = 0; i < 3; i++) {
    const ax = 444 + i * 74, ay = band + 22;
    for (let s = 0; s < 6; s++) {
      const p = new Path2D;
      p.moveTo(ax + s * 11, ay); p.lineTo(ax + (s + 1) * 11, ay); p.lineTo(ax + (s + 1) * 11, ay + 15 + 3 * sin((s + 1) * 0.9)); p.lineTo(ax + s * 11, ay + 15 + 3 * sin(s * 0.9)); p.closePath();
      fill(p, s % 2 === 0 ? cloths[i].a(night ? 0.7 : 1) : H(night ? '8C8068' : 'F4E8CF'));
    }
    seg(trunk, ax - 1, ay, ax + 67, ay, 1.6, 'round');
    seg(trunk, ax, ay, ax, foot, 1.2); seg(trunk, ax + 66, ay, ax + 66, foot, 1.2);
  }
  box(walls[1], 672, band + 30, 196, foot - band - 30);
  for (let i = 0; i < 10; i++) seg(trunk, 680 + i * 20, band + 24, 680 + i * 20, foot, 3);
  box(lerp(leaf, trunk, 0.4), 668, band + 16, 204, 9);
  const fringe = new Path2D; fringe.moveTo(668, band + 25);
  for (let i = 0; i < 25; i++) { fringe.lineTo(668 + i * 8 + 4, band + 31); fringe.lineTo(668 + i * 8 + 8, band + 25); }
  fringe.lineTo(872, band + 25); fringe.closePath();
  fill(fringe, leaf);
  // The lamps' cord runs on down the lane and is tied to the city wall's end face, where the loop reaches Read.
  const cordEnd = ROUND - 9, cord = new Path2D; cord.moveTo(880, band + 10); cord.quadraticCurveTo((880 + cordEnd) / 2, band + 30, cordEnd, band + 10);
  // Its first end is tied to a pole standing in the street, as the stalls' cloths are: it hung in the air (owner, 22 November).
  seg(trunk, 880, band + 6, 880, foot, 1.6, 'round');
  disc(trunk, 1.6, 880, band + 6);
  line(cord, shade, 0.7);
  for (let i = 1; i <= 7; i++) {
    const t = i / 8, cx = 880 + (cordEnd - 880) * t, cy = band + 10 + 40 * t * (1 - t);
    disc(lit.a(night ? 0.35 : 0.2), 6, cx, cy + 4);
    box(lit, cx - 1.6, cy + 1, 3.2, 5);
  }
  box(shade.a(0.35), PAGE, foot, R - PAGE, 1.2);
  const st = Rand(3);
  for (let i = 0; i < 70; i++) {
    const sx = PAGE + 12 + st() * (WORLD - PAGE - 24), sy = foot + 34 + st() * (h - foot - 90);
    seg(shade.a(0.10), sx, sy, sx + 8 + st() * 14, sy, 0.9, 'round');
  }
  cityWall(c, night, band, h);
  // Coming round from the lane, the city wall stands again at Read, its end face towards the lane.
  clipped(ROUND - 9, 0, R - ROUND + 9, h + 50, () => at(ROUND, 0, 1, 1, () => cityWall(c, night, band, h)));
  box(grad(ROUND - 9, 0, ROUND, 0, [H(night ? '1A130E' : 'B89F78'), H(night ? '0C0806' : '7A6040')]), ROUND - 9, band - 9, 9, h);
}

function cityWall(c, night, band, h) {
  const tones = (night ? ['221912', '1E1610', '201811'] : ['DCC8A6', 'D2BB95', 'D6C09B']).map(s => H(s));
  const joint = H(night ? '0C0806' : '9C8460', 0.55);
  clipped(L, band - 2, PAGE - L, h, () => {
    for (let y = 0, row = 0; y < h; y += 15, row++)
      for (let x = (row % 2 === 0 ? 0 : -28) + L, n = row; x < PAGE; x += 56, n++) { box(tones[n % 3], x, y, 56, 15); edge(joint, x, y, 56, 15, 0.7); }
    if (night) box(glow(110, band + 60, 200, [c.bgTintA, CLEAR]), L, 0, PAGE - L, h);
    else box(grad(0, 0, PAGE, h, [[0, H('FFF3D0', 0.55)], [0.6, CLEAR], [1, H('5A4030', 0.22)]]), L, 0, PAGE - L, h);
  });
  clipped(L, 0, PAGE - L, h, () => {
    for (let i = -8; i < 8; i++) { box(tones[1], i * 30 - 6, band - 9, 20, 9); edge(joint, i * 30 - 6, band - 9, 20, 9, 0.7); }
    box(H(night ? '2A1F17' : 'C7AE86'), L, band - 2, PAGE - L, 5);
    edge(joint, L, band - 2, PAGE - L, 5, 0.5);
  });
  box(grad(PAGE, 0, PAGE + 9, 0, [H(night ? '0C0806' : '7A6040'), H(night ? '1A130E' : 'B89F78')]), PAGE, band - 9, 9, h);
}

function courtyard(c, night, band, h) {
  const floorTop = band + 60, green = H(night ? '0F3D2B' : '1D6B4C');
  box(H(night ? '1B2D25' : 'F1E6D0'), L, band, R - L, 60);
  box(H(night ? '6A3A2A' : 'B5553A'), L, band, R - L, 4);
  const shadow = H(night ? '0E1D17' : 'B4C9B6'), pillar = H(night ? '2C3E35' : 'E2D2B4');
  // The arcade, and its first arches again where the loop comes back to Read (44 goes into ROUND exactly).
  for (const i of [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 27, 28, 29]) {
    const x = 6 + i * 44, p = new Path2D;
    p.moveTo(x, floorTop); p.lineTo(x, band + 30); p.ellipse(x + 16, band + 30, 16, 17, 0, PI, 2 * PI); p.lineTo(x + 32, floorTop); p.closePath();
    fill(p, shadow);
    box(pillar, x - 4, band + 28, 6, 32);
  }
  for (let tx = 680; tx < ROUND - 150; tx += 45) {
    seg(H(night ? '1D150F' : '7A5522'), tx, floorTop, tx, floorTop - 20, 2.2);
    const cy = floorTop - 30;
    disc(lerp(green, WHITE, night ? 0 : 0.12), 14, tx, cy);
    for (const [dx, dy] of [[-0.4, -0.2], [0.35, 0.1], [0, 0.5], [-0.1, -0.6]]) disc(H('E8892E'), 1.7, tx + dx * 14, cy + dy * 14);
  }
  for (const x of [-219, 1, 219, 439, 661, ROUND + 1]) at(x, floorTop, 1, 1, () => fill("M0 0C-9 -24 -4 -46 0 -60C4 -46 9 -24 0 0Z", green));
  box(H(night ? '1A2620' : 'D9B48A'), L, floorTop, R - L, h - floorTop);
  const brick = new Path2D;
  for (let y = floorTop; y < h; y += 20) for (const x0 of [L, ROUND - 140]) for (let x = x0; x < (x0 === L ? 680 : R); x += 20) {
    brick.moveTo(x, y + 10); brick.lineTo(x + 10, y); brick.moveTo(x + 10, y + 20); brick.lineTo(x + 20, y + 10);
    brick.moveTo(x, y + 10); brick.lineTo(x + 10, y + 20); brick.moveTo(x + 10, y); brick.lineTo(x + 20, y + 10);
  }
  line(brick, H(night ? '0D1712' : 'B48A5C'), 1);
  const grass = H(night ? '12301F' : 'A9CF8F');
  box(grad(630, 0, 690, 0, [grass.a(0), grass]), 630, floorTop, 60, h - floorTop);
  box(grass, 690, floorTop, ROUND - 210 - 690, h - floorTop);
  box(grad(ROUND - 210, 0, ROUND - 150, 0, [grass, grass.a(0)]), ROUND - 210, floorTop, 60, h - floorTop);
  box(c.bg.a(0.5), L, floorTop, R - L, h - floorTop);
  const water = H(night ? '2F86A8' : '7CC7E2'), glint = H('CDEEF7');
  const quad = (a, b, cx, end, col) => { const p = new Path2D; p.moveTo(cx - a, floorTop); p.lineTo(cx + a, floorTop); p.lineTo(cx + b, end); p.lineTo(cx - b, end); p.closePath(); fill(p, col); };
  box(water.a(night ? 0.5 : 0.8), L, floorTop + 2, R - L, 3.5);
  box(glint.a(night ? 0.25 : 0.6), L, floorTop + 3, R - L, 1);
  quad(10, 18, 110, h, water.a((night ? 0.45 : 0.75) * 0.35));
  quad(4, 7, 110, h, glint.a((night ? 0.25 : 0.7) * 0.35));
}

function tentPalms(night, h) {
  const trunk = H(night ? '2A2018' : '7A5522'), leaf = H(night ? '1F5C3C' : '1F7A45');
  palm(9, h - 40, 78, -3, 0.62, trunk, leaf); palm(211, h - 38, 86, 3, 0.62, trunk, leaf);
}

function oasis(c, night, band, h) {
  const dunes = (night ? ['3B3350', '2E2942', '232037'] : ['EBC489', 'E3B673', 'D9A862']).map(s => H(s));
  const beast = H(night ? '14121F' : '7A5522'), trunk = H(night ? '2A2018' : '7A5522'), leaf = H(night ? '1F5C3C' : '1F7A45');
  const crest = round(x => band + 62 + 5 * sin(x / 61) + 3 * sin(x / 27 + 1));
  const dune = (f, color) => {
    const e = new Path2D, body = new Path2D;
    e.moveTo(L, f(L)); body.moveTo(L, f(L));
    for (let x = L; x <= R; x += 10) { e.lineTo(x, f(x)); body.lineTo(x, f(x)); }
    body.lineTo(R, h); body.lineTo(L, h); body.closePath();
    fill(body, color); line(e, WHITE.a(night ? 0.06 : 0.22), 1.2);
  };
  dune(crest, dunes[0]);
  dune(round(x => h * 0.44 + 12 * sin(x / 83 + 2)), dunes[1]);
  dune(round(x => h * 0.66 + 9 * sin(x / 97 + 4)), dunes[2]);
  const shadow = (x, w) => oval(BLACK.a(night ? 0.25 : 0.14), x, crest(x + w / 2) - 1.5, w, 4);
  const camel = (x, s, flip = false) => { const left = flip ? x - 38 * s : x; shadow(left, 38 * s); put(CAMEL, beast, x, crest(left + 19 * s) + 1, s, flip); };
  const tent = (x, flip) => {
    const left = flip ? x - 46 : x; shadow(left - 2, 50);
    const y = crest(left + 23) + 2;
    put(TENT, H(night ? '3A3346' : 'FFF8E6'), x, y, 1.05, flip);
    put("M19 0L22 -14L25 0Z", H(night ? '14121F' : '5A4326'), x, y, 1.05, flip);
    at(x, y, flip ? -1.05 : 1.05, 1.05, () => saduBand(4, -7, 36, 3.5));
  };
  const tree = (x, tall, lean) => { shadow(x - 6, 14); palm(x, crest(x) + 1, tall, lean, 0.62, trunk, leaf); };
  camel(196, 0.6); camel(224, 0.95); camel(266, 0.6); camel(392, 1.05);
  tent(444, false); tent(656, true); camel(600, 0.55, true);
  for (const [x, tall, lean] of [[668, 80, -4], [686, 62, 5], [856, 66, -5], [872, 84, 4], [890, 58, 3]]) tree(x, tall, lean);
  camel(1088, 0.8, true);
  // The green ground. A phone's rises behind the tab bar; a desktop window has none, so it lies lower.
  const lift = PHONE ? 90 : 60;
  const top = round(x => h - lift + 6 * sin(x / 50) + 3 * sin(x / 19));
  const grass = new Path2D; grass.moveTo(L, top(L));
  for (let x = L; x <= R; x += 10) grass.lineTo(x, top(x));
  grass.lineTo(R, h); grass.lineTo(L, h); grass.closePath();
  fill(grass, grad(0, h - lift - 10, 0, h, [H(night ? '245C40' : 'A8D38C'), H(night ? '17402C' : '5FAE6B')]));
  // The palms by the tent you read in. A wide window would show them from the next page, behind its cards.
  if (PHONE) tentPalms(night, h);
}

function cave(c, night, band, h) {
  const deep = H(night ? '0A0706' : '241B17');
  // A desktop window has no tab bar for the cave floor's rock to stand on, so it stands on the window's foot.
  const floor = PHONE ? 48 : 6;
  const rock = (x0) => box(grad(x0, 0, x0 + PAGE, h, [H(night ? '2A211D' : '5C4A40'), H(night ? '120E0C' : '3A2D27')]), L, 0, R - L, h);
  rock(0);
  // Deeper in is darker; past About the dark lifts again towards the mouth, where the loop comes back to Read.
  arriving(h, () => rock(ROUND));
  box(grad(PAGE, 0, ROUND, 0, [[0, BLACK.a(0)], [(WORLD - PAGE) / (ROUND - PAGE), BLACK.a(0.42)], [1, BLACK.a(0)]]), PAGE, 0, R - PAGE, h);
  // The seams of the rock. Each one drifts as it goes, so past About it is drawn on to meet itself where Read begins.
  const cracks = new Path2D;
  for (let i = 0; band + 26 + i * 40 < h; i++) {
    let x = L - 10 + (i % 2) * 14, y = band + 26 + i * 40, n = i;
    const pts = [[x, y]];
    while (x < WORLD) { const dx = 40 + (n * 37) % 50, dy = 8 - (n % 4) * 5; x += dx; y += dy; pts.push([x, y]); y -= dy * 0.9; n++; }
    const at = t => { for (let k = 1; k < pts.length; k++) if (pts[k][0] >= t && pts[k][0] > pts[k - 1][0]) { const [x0, y0] = pts[k - 1], [x1, y1] = pts[k]; return y0 + (y1 - y0) * (t - x0) / (x1 - x0); } return pts[pts.length - 1][1]; };
    cracks.moveTo(pts[0][0], pts[0][1]);
    for (const [px, py] of pts) if (px <= WORLD) cracks.lineTo(px, py);
    cracks.lineTo(WORLD, at(WORLD));
    cracks.quadraticCurveTo(WORLD + PAGE / 2, (at(WORLD) + at(0)) / 2 + 6, ROUND, at(0));
    cracks.lineTo(ROUND + 20, at(20));
  }
  line(cracks, deep.a(0.7), 1);
  fill("M0 250l34 -12l20 30l-30 26L0 300zM220 210l-30 10l-12 34l22 20l20 -8z", H(night ? '171210' : '3A2D27', 0.8));
  // The boulder against the mouth's left side has its other half where the loop reaches Read.
  at(ROUND, 0, -1, 1, () => fill("M0 250l34 -12l20 30l-30 26L0 300z", H(night ? '171210' : '3A2D27', 0.8)));
  const mx = 110, my = h * 0.42;
  X.save(); X.translate(mx, my); X.scale(2.6, 1); X.translate(-mx, -my);
  disc(glow(mx, my, h * 0.55, [c.bgTintA, CLEAR]), h * 0.55, mx, my);
  X.restore();
  arriving(h, () => { X.save(); X.translate(mx + ROUND, my); X.scale(2.6, 1); X.translate(-mx - ROUND, -my); disc(glow(mx + ROUND, my, h * 0.55, [c.bgTintA, CLEAR]), h * 0.55, mx + ROUND, my); X.restore(); });
  const light = H(night ? 'B7C6F5' : 'FFE9B0');
  const shaft = new Path2D; shaft.moveTo(1030, band - 4); shaft.lineTo(1052, band - 4); shaft.lineTo(1030, h - floor - 2); shaft.lineTo(950, h - floor - 2); shaft.closePath();
  fill(shaft, grad(0, band, 0, h - floor - 2, [light.a(0.22), light.a(0.05)]));
  oval(light.a(0.16), 942, h - floor - 14, 96, 18);
  const ridgeLine = "M0 70L26 54L48 66L84 40L112 60L150 34L186 58L220 58V-200H0Z";
  at(0, band - 62, 1, 1, () => fill(ridgeLine, deep));
  at(0, band - 62, -1, 1, () => fill(ridgeLine, deep));
  // Past About the roof stays plain, no peaks under the bar, and only at the very end dips to meet the mouth's brow at Read.
  // Its lower edge is rough rock, not a ruled line under the bar.
  // It reaches just below the bar everywhere (above it a strip of lighter rock showed under the bar).
  const edgeY = x => band + 3 + 1.6 * sin(x / 23 + 1) + 1.2 * sin(x / 41 + 2);
  // It starts under the end of the mouth's brow, so no lighter rock shows between the brow and the bar.
  const roof = new Path2D; roof.moveTo(186, 0); roof.lineTo(186, edgeY(186));
  for (let x = 189; x <= ROUND - 50; x += 3) roof.lineTo(x, edgeY(x));
  roof.quadraticCurveTo(ROUND - 12, edgeY(ROUND - 50), ROUND, band + 8); roof.lineTo(ROUND, 0); roof.closePath();
  fill(roof, deep);
  // Read stays clear of hanging rock under its bar; it begins a little way in.
  spikes(13, PAGE + 30, WORLD, band - 4, true, deep, 46);
  spikes(29, PAGE, WORLD, h, false, deep, 34, true);
}


/* ---- Palettes, generated from Android ui/theme/Colors.kt placeColors(). [light, dark]. ---- */
const PAL = {
  manuscript: [{bg:'EBDDBB',surface:'F6ECD2',text:'2A1D10',textSoft:'4F3C28',muted:'6F5A45',accent:'1F3A78',accentInk:'1F3A78',gold:'B08436',highlight:'9B2A1C',line:'B08436',lineA:0.4,glowA:'B48A3C',glowAA:0.2,primary:'5A2E1A',onPrimary:'F4E6BE',chrome:'1F3A78'},
    {bg:'0F1424',surface:'161C31',text:'ECE2C8',textSoft:'CFC3A6',muted:'9C9178',accent:'9DB4F0',accentInk:'AFC2F3',gold:'D6B25E',highlight:'E58A76',line:'D6B25E',lineA:0.3,glowA:'D6B25E',glowAA:0.13,primary:'5A2E1A',onPrimary:'F4EAD2',chrome:'18264F'}],
  bahr: [{bg:'F1E4C6',surface:'FBF4E2',text:'1F2A30',textSoft:'3F5158',muted:'5E7076',accent:'0F6F82',accentInk:'0F6F82',gold:'B08436',highlight:'C0603A',line:'0F6F82',lineA:0.16,glowA:'FFF3D0',glowAA:0.5,primary:'0F6F82',onPrimary:'FFFFFF'},
    {bg:'0A1620',surface:'11242F',text:'E4EEF0',textSoft:'B7CCD1',muted:'82999F',accent:'6FD0DE',accentInk:'8ADAE6',gold:'D6B25E',highlight:'E8A07A',line:'6FD0DE',lineA:0.18,glowA:'B7C6F5',glowAA:0.12,primary:'198095',onPrimary:'FFFFFF'}],
  bab: [{bg:'D8C29E',surface:'EFE2C6',text:'33241A',textSoft:'5A4636',muted:'6A5644',accent:'8A3B22',accentInk:'8A3B22',gold:'A0732A',highlight:'B5553A',line:'7A5A3A',lineA:0.35,glowA:'FFF3D0',glowAA:0.5,primary:'6B3B22',onPrimary:'F3E3C2'},
    {bg:'1A130E',surface:'2A1F17',text:'F3E6D2',textSoft:'D8C6AE',muted:'A38F77',accent:'E8A865',accentInk:'EDB57A',gold:'F2C06A',highlight:'D9805C',line:'F2C06A',lineA:0.22,glowA:'FFB050',glowAA:0.2,primary:'7A4526',onPrimary:'F3E3C2'}],
  courtyard: [{bg:'DCEBDD',surface:'FBFDF9',text:'173226',textSoft:'355546',muted:'4E6B5C',accent:'1D6B4C',accentInk:'1D6B4C',gold:'2F7FA0',highlight:'B5553A',line:'1D6B4C',lineA:0.13,glowA:'D39A2C',glowAA:0.15,primary:'1D6B4C',onPrimary:'F7FAF5'},
    {bg:'0B1813',surface:'12261D',text:'E2EFE6',textSoft:'BBD3C4',muted:'85A193',accent:'7FD6A7',accentInk:'8FDDB3',gold:'7CC7E2',highlight:'F0C060',line:'7FD6A7',lineA:0.14,glowA:'F0C060',glowAA:0.09,primary:'2A7E5A',onPrimary:'F7FAF5'}],
  waha: [{bg:'F3DDB0',surface:'FFF8E6',text:'3A2A16',textSoft:'5C4526',muted:'73593A',accent:'1F7A45',accentInk:'1A6B3C',gold:'B98A44',highlight:'A9322A',line:'7A5522',lineA:0.22,glowA:'FFF3C9',glowAA:0.5,primary:'1F7A45',onPrimary:'FFF8E6'},
    {bg:'171A2C',surface:'242238',text:'F4E8CF',textSoft:'D9C9A8',muted:'A39679',accent:'6FD39A',accentInk:'7FDCA6',gold:'E0BD85',highlight:'E5796C',line:'E0BD85',lineA:0.2,glowA:'E0BD85',glowAA:0.12,primary:'2A804E',onPrimary:'FFF8E6'}],
  hira: [{bg:'4A3B33',surface:'5C4A40',text:'F6E3C4',textSoft:'E2CDB0',muted:'CDB8A3',accent:'F1C98B',accentInk:'F1C98B',gold:'C89B6A',highlight:'F0BE84',line:'C9A98C',lineA:0.28,glowA:'FFD9A0',glowAA:0.45,primary:'A2542C',onPrimary:'FFF3DC'},
    {bg:'1C1614',surface:'2A211D',text:'ECDCC3',textSoft:'D0BEA6',muted:'A8968A',accent:'E0B27A',accentInk:'E6BD8A',gold:'B08A66',highlight:'9DB4F0',line:'B89A82',lineA:0.24,glowA:'8FA9EC',glowAA:0.18,primary:'8A4726',onPrimary:'FFF3DC'}],
};
const TONES = Object.fromEntries(Object.entries(PAL).map(([name, pair]) => [name, pair.map(p => ({
  bg: H(p.bg), bgTintA: H(p.glowA, p.glowAA), surfaceSolid: H(p.surface), border: H(p.line, p.lineA), text: H(p.text), muted: H(p.muted),
  accent: H(p.accent), gold: H(p.gold), highlight: H(p.highlight), primary: H(p.primary), chrome: p.chrome ? H(p.chrome) : CLEAR,
}))]));
const SKY = {
  waha: { day: ['BFE1EC', 'FBE6B8', 'F6CF8C'], dark: ['0B1026', '1B1D38', '3A2F4A'], depth: 80, horizon: 62, stars: 50 },
  bahr: { day: ['BFE1EC', 'F1E4C6'], dark: ['0A1424', '0A1620'], depth: 50, horizon: 52, stars: 20 },
  courtyard: { day: ['BFE3EE', 'E6F2E6'], dark: ['0B1A2A', '12261D'], depth: 60, horizon: 6, stars: 0 },
  bab: { day: ['BFE0EE', 'EFE3C6'], dark: ['0E1830', '1A1A2A'], depth: 66, horizon: 58, stars: 20 },
};
const SCENE = { bahr: sea, bab: city, courtyard, waha: oasis, hira: cave };
// Lighter in the Sea, Bab and Court, in Android's proportions (AND-012, AND-014, AND-015); the Sea's lighter still at night.
const CLEARING = { bahr: 0.71, bab: 0.72, courtyard: 0.7, waha: 0.85 };
const clearingFor = () => page > 0 && (look === 'bahr' && night ? 0.54 : CLEARING[look]) || 0;


/* ---- The reading frames, from ui/reader/ReadingPlaces.kt. D is CSS px per Android dp at this size. ---- */
let D = 1.35;
const gate = w => { const ringW = 18 * D, outer = w / 2, inner = outer - ringW, half = inner / 1.08; return { ringW, outer, inner, half, jamb: w / 2 - half, spring: outer + sqrt(inner * inner - half * half), turn: acos(half / inner) }; };
const rr = (x, y, w, h, r) => { const p = new Path2D; p.roundRect(x, y, w, h, r); return p; };
const shade = (color, blur, dy, f) => { X.save(); X.shadowColor = color; X.shadowBlur = blur; X.shadowOffsetY = dy; f(); X.restore(); };
const caveShape = (w, h) => `M${w * 0.02} ${h}C0 ${h * 0.7} 0 ${h * 0.42} ${w * 0.07} ${h * 0.22}C${w * 0.12} ${h * 0.09} ${w * 0.22} ${h * 0.10} ${w * 0.32} ${h * 0.05}C${w * 0.42} 0 ${w * 0.52} ${h * 0.04} ${w * 0.62} ${h * 0.02}C${w * 0.74} 0 ${w * 0.86} ${h * 0.06} ${w * 0.92} ${h * 0.18}C${w} ${h * 0.36} ${w} ${h * 0.7} ${w * 0.98} ${h}Z`;
function lantern(c, w, h) {
  const brass = c.gold;
  disc(glow(w / 2, h * 0.55, h * 0.75, [c.bgTintA.a(min(c.bgTintA.al * 2.4, 0.7)), CLEAR]), h * 0.75, w / 2, h * 0.55);
  seg(brass, w / 2, 0, w / 2, h * 0.15, 1.3 * D);
  const poly = pts => { const p = new Path2D; pts.forEach(([x, y], i) => i ? p.lineTo(w * x, h * y) : p.moveTo(w * x, h * y)); p.closePath(); return p; };
  fill(poly([[.27, .2], [.73, .2], [.64, .3], [.36, .3]]), brass);
  const body = poly([[.23, .33], [.77, .33], [.86, .48], [.77, .8], [.23, .8], [.14, .48]]);
  fill(body, brass.a(0.28)); line(body, brass, 1.3 * D);
  seg(brass.a(0.7), w / 2, h * 0.36, w / 2, h * 0.77, D);
  fill(poly([[.32, .83], [.68, .83], [.56, .93], [.44, .93]]), brass);
  disc(brass, 1.6 * D, w / 2, h * 0.97);
}
const FRAMES = {
  manuscript(c, night, w, h) {
    const d = D;
    box(c.surfaceSolid, 0, 0, w, h);
    edge(c.gold, d, d, w - 2 * d, h - 2 * d, 2 * d);
    edge(c.accent.a(0.8), 5 * d, 5 * d, w - 10 * d, h - 10 * d, 0.8 * d);
    vineBand(5 * d, 6 * d, w - 10 * d, 9 * d, c.gold.a(0.8), c.highlight);
    vineBand(5 * d, h - 15 * d, w - 10 * d, 9 * d, c.gold.a(0.8), c.highlight);
    seg(c.gold, w, h / 2 - 15 * d, w, h / 2 + 15 * d, 1.2 * d);
    disc(c.chrome, 8 * d, w, h / 2); ring(c.gold, 8 * d, w, h / 2, 1.5 * d); disc(c.gold, 4 * d, w, h / 2);
  },
  bahr(c, night, w, h) {
    const d = D, slab = rr(0, 0, w, h, [30 * d, 30 * d, 5 * d, 5 * d]);
    shade('rgba(0,0,0,.3)', 10 * d, 3 * d, () => fill(slab, c.surfaceSolid));
    line(slab, c.gold.a(0.7), 1.2 * d);
    line(rr(5 * d, 5 * d, w - 10 * d, h - 10 * d, [25 * d, 25 * d, 2 * d, 2 * d]), c.accent.a(0.45), 0.8 * d);
  },
  bab(c, night, w, h) {
    const d = D, g = gate(w), cx = w / 2;
    const stone = H(night ? '3A2A1E' : 'F3E7D0'), joint = H(night ? '140D08' : '7A5A3A');
    const start = PI - g.turn, each = (PI + 2 * g.turn) / 15;
    for (let i = 0; i < 15; i++) {
      const p = new Path2D; p.arc(cx, g.outer, g.outer, start + i * each, start + (i + 1) * each); p.arc(cx, g.outer, g.inner, start + (i + 1) * each, start + i * each, true); p.closePath();
      fill(p, i % 2 === 1 ? c.highlight : stone); line(p, joint, 0.6 * d);
    }
    for (const x of [g.jamb - 12 * d, w - g.jamb - 2 * d]) { box(lerp(stone, joint, 0.25), x, g.spring - 2 * d, 14 * d, 8 * d); edge(joint, x, g.spring - 2 * d, 14 * d, 8 * d, 0.6 * d); }
    const open = new Path2D; open.moveTo(g.jamb, h); open.lineTo(g.jamb, g.spring); open.arc(cx, g.outer, g.inner, PI - g.turn, 2 * PI + g.turn); open.lineTo(w - g.jamb, h); open.closePath();
    X.save(); X.clip(open);
    box(grad(0, 0, 0, h, [c.surfaceSolid, lerp(c.surfaceSolid, c.bg, 0.45)]), 0, 0, w, h);
    box(glow(cx, g.outer * 0.5, g.inner, [c.bgTintA.a(night ? 0.3 : 0.6), CLEAR]), 0, 0, w, h);
    const town = lerp(c.surfaceSolid, c.primary, 0.16), plot = g.half * 2 / 7;
    for (let i = 0; i < 7; i++) {
      const tall = (16 + (i * 37) % 24) * d;
      box(town, g.jamb + i * plot, h - tall, plot + 1, tall);
      box(lerp(town, c.primary, 0.25), g.jamb + i * plot + plot * 0.4, h - tall + 6 * d, 3 * d, 5 * d);
    }
    // The doors, standing open at the jambs.
    for (const x of [g.jamb, w - g.jamb - 7 * d]) { box(c.primary, x, 0, 7 * d, h); box(BLACK.a(0.36), x, 0, 7 * d, h); }
    X.restore();
    at(cx - 11 * d, g.ringW + 12 * d, 1, 1, () => lantern(c, 22 * d, 40 * d));
  },
  courtyard(c, night, w, h) {
    const d = D, slab = rr(0, 0, w, h, 12 * d);
    shade(c.accent.a(0.35), 16 * d, 5 * d, () => fill(slab, c.surfaceSolid));
    X.save(); X.clip(slab);
    box(c.accent, 0, 0, w, 4 * d);
    for (const [lift, al] of [[22, 0.28], [12, 0.16]]) {
      const y = h - lift * d, v = new Path2D; v.moveTo(w * 0.04, y); v.bezierCurveTo(w * 0.3, y - 9 * d, w * 0.7, y + 9 * d, w * 0.96, y - 3 * d);
      line(v, c.muted.a(al), 0.8 * d);
    }
    X.restore();
  },
  waha(c, night, w, h) {
    const d = D, cloth = new Path2D;
    cloth.moveTo(0, 0); cloth.lineTo(w, 0); cloth.lineTo(w, h - 9 * d); cloth.bezierCurveTo(w * 0.7, h + 2 * d, w * 0.35, h - 16 * d, 0, h - 2 * d); cloth.closePath();
    const pole = c.border.a(1);
    shade(pole.a(0.45), 14 * d, 4 * d, () => fill(cloth, c.surfaceSolid));
    X.save(); X.clip(cloth); saduBand(0, 0, w, 15 * d); X.restore();
    seg(pole, -6 * d, 0, w + 6 * d, 0, 3 * d, 'round');
    seg(pole, -4 * d, 0, -10 * d, 22 * d, 1.4 * d); seg(pole, w + 4 * d, 0, w + 10 * d, 22 * d, 1.4 * d);
  },
  hira(c, night, w, h) {
    const d = D, mouth = new Path2D(caveShape(w, h));
    fill(mouth, H(night ? '0E0A08' : '2C221D'));
    X.save(); X.translate(w / 2, h); X.scale(0.955, 0.965); X.translate(-w / 2, -h);
    if (!night) fill(mouth, glow(w / 2, h * 0.3, max(w, h) * 0.8, [[0, H('FFF6DE')], [0.55, H('FBE3B4')], [1, H('F0BE84')]]));
    else {
      fill(mouth, grad(0, 0, 0, h, [H('0B1026'), H('1B2444'), H('3A3350')]));
      X.save(); X.clip(mouth); at(0, 0, w / 220, w / 220, () => stars(h * 0.13 / (w / 220))); X.restore();
    }
    const fl = new Path2D; fl.moveTo(w * 0.1, h); fl.bezierCurveTo(w * 0.3, h - 30 * d, w * 0.42, h - 12 * d, w * 0.52, h - 26 * d); fl.bezierCurveTo(w * 0.68, h - 40 * d, w * 0.8, h - 18 * d, w * 0.9, h); fl.closePath();
    fill(fl, H(night ? '171210' : 'C89B6A', 0.55));
    X.restore();
  },
};

/** Where the text box sits in each frame, clear of its border, band or curve: [side, top, gap under the title]. */
function textBox(look, w, h) {
  const d = D;
  if (look === 'bab') {
    const g = gate(w), reach = g.half - 14 * d, clearTop = g.outer - sqrt(g.inner * g.inner - reach * reach), top = g.ringW + 12 * d + 40 * d + 6 * d;
    // Wider than the phone's 12dp: the open door leaf stands 7dp into the opening.
    return [g.jamb + (PHONE ? 12 : 20) * d, top, max(clearTop - top - 34, 0) + 8 * d];
  }
  if (look === 'hira') return [w * 0.13, h * 0.15, max(h * 0.09 - 34, 0) + 8 * d];
  return { manuscript: [20 * d, 26 * d, 10 * d], bahr: [19 * d, 27 * d, 12 * d], courtyard: [20 * d, 20 * d, 10 * d], waha: [20 * d, 29 * d, 10 * d] }[look];
}

/* ---- The covers: what each place draws across when the narration or the screen changes. From ui/reader/PlaceTurns.kt. ---- */
const wavy = (to, f, across) => { const p = new Path2D; for (let i = 0; i <= 40; i++) { const t = to * i / 40; across ? p.lineTo(t, f(t)) : p.lineTo(f(t), t); } return p; };

function seaPiece(w, h, d, night) {
  const deep = H(night ? '0A3140' : '1C8FA6'), mid = H(night ? '14586C' : '58BCCB'), foam = WHITE.a(night ? 0.6 : 0.92), swell = 9 * d, reach = w / 2 + swell * 1.5;
  const face = y => reach + swell * 0.4 * sin(y / (26 * d) + 9) + swell * 0.4 * sin(y / (9 * d) - 14);
  const body = wavy(h, face); body.lineTo(-1, h); body.lineTo(-1, 0); body.closePath();
  fill(body, grad(0, 0, reach, 0, [deep, mid]));
  for (let i = 1; i <= 3; i++) line(wavy(h, y => reach * i / 4 + 4 * d * sin(y / (30 * d) + i + 6)), WHITE.a(0.10), 2 * d);
  line(wavy(h, face), foam, 3 * d, 'round');
  X.setLineDash([3 * d, 11 * d]); line(wavy(h, y => reach + swell * 1.6 + swell * sin(y / (17 * d) + 11)), foam.a(foam.al * 0.35), 1.2 * d); X.setLineDash([]);
}

function leafPiece(leaf, h, d, c) {
  const wood = c.primary, iron = lerp(c.primary, BLACK, 0.55), brass = c.gold, plank = leaf / 5;
  box(grad(0, 0, leaf, 0, [lerp(wood, BLACK, 0.25), wood, lerp(wood, WHITE, 0.06)]), 0, 0, leaf, h);
  for (let i = 1; i <= 4; i++) seg(iron.a(0.55), i * plank, 0, i * plank, h, d);
  for (let y = h * 0.16; y < h; y += h * 0.27) { box(iron, 0, y, leaf, 7 * d); for (let i = 0; i < 5; i++) disc(brass, 2.6 * d, plank * (i + 0.5), y + 3.5 * d); }
  ring(brass, 7 * d, leaf - 16 * d, h * 0.56, 2 * d); disc(brass, 2.4 * d, leaf - 16 * d, h * 0.56 - 7 * d);
  seg(BLACK.a(0.5), leaf, 0, leaf, h, d);
}

function latticePiece(half, h, d, c) {
  const wood = lerp(c.primary, BLACK, 0.25), bars = new Path2D;
  box(c.surfaceSolid, 0, 0, half, h);
  for (let x = -h; x < half; x += 24 * d) { bars.moveTo(x, 0); bars.lineTo(x + h, h); bars.moveTo(x + h, 0); bars.lineTo(x, h); }
  line(bars, wood, 3.2 * d);
  edge(wood, 0, 0, half, h, 12 * d);
  seg(BLACK.a(0.35), half, 0, half, h, 1.5 * d);
}

function flapPiece(w, drop, d, c) {
  const cloth = lerp(c.surfaceSolid, c.text, 0.07), band = 15 * d;
  const hem = x => drop + 3.5 * d * sin(x / (34 * d) + 7);
  const flap = wavy(w, hem, true); flap.lineTo(w, -1); flap.lineTo(0, -1); flap.closePath();
  X.save(); X.clip(flap);
  box(cloth, 0, 0, w, drop + 8 * d);
  for (let x = w / 12; x < w; x += w / 6) seg(c.text.a(0.16), x, 0, x + 6 * d * sin(x), drop, 6 * d);
  saduBand(0, drop - band - 8 * d, w, band);
  X.restore();
  line(wavy(w, hem, true), c.text.a(0.5), 1.5 * d);
}

/** The cover of the current look over [host], [w] by [h]: its pieces stand open, and shut()/open() move them from wherever they are. */
function buildCover(host, w, h, d, n, jamb = 0, ajar = 0) {
  const c = TONES[look][n], parts = [];
  const piece = (cw, ch, left, paint, mirror) => {
    const wrap = make('place-piece', host), canvas = make('', wrap, 'canvas');
    wrap.style.cssText = `left:${left}px;width:${cw}px;height:${ch}px`;
    onto(canvas, cw, ch); paint();
    if (mirror) canvas.style.transform = 'scaleX(-1)';
    return wrap;
  };
  if (look === 'bahr') {
    const cw = w / 2 + 9 * d * 4.5;
    parts.push([piece(cw, h, 0, () => seaPiece(w, h, d, !!n)), `translateX(${-cw}px)`, 'none'], [piece(cw, h, w - cw, () => seaPiece(w, h, d, !!n), true), `translateX(${cw}px)`, 'none']);
  } else if (look === 'bab') {
    const leaf = w / 2 - jamb, edgeOn = `scaleX(${Math.max(ajar / leaf, 0.001)})`;
    for (const right of [false, true]) {
      const door = piece(leaf, h, right ? w / 2 : jamb, () => leafPiece(leaf, h, d, c), right), dim = make('place-dim', door);
      door.style.transformOrigin = right ? '100% 0' : '0 0';
      parts.push([door, edgeOn, 'none'], [dim, { opacity: 0.38 }, { opacity: 0 }]);
    }
  } else if (look === 'courtyard') {
    parts.push([piece(w / 2, h, 0, () => latticePiece(w / 2, h, d, c)), 'translateX(-100%)', 'none'], [piece(w / 2, h, w / 2, () => latticePiece(w / 2, h, d, c), true), 'translateX(100%)', 'none']);
  } else if (look === 'waha') {
    const drop = h + 27 * d;
    parts.push([piece(w, drop + 8 * d, 0, () => flapPiece(w, drop, d, c)), 'translateY(-100%)', 'none']);
  } else if (look === 'hira') {
    // The daylight draws in to a point and goes out: rings of dark, each closer in than the last, and then all of it.
    const far = Math.hypot(w / 2, h * 0.7);
    [0.84, 0.62, 0.43, 0.27, 0.13, 0].forEach((r, i, all) => {
      const ring = make('place-dark', host), from = i / all.length * 0.82;
      if (r) ring.style.background = `radial-gradient(circle at 50% 30%, transparent ${far * r * 0.55}px, #0b0807 ${far * r}px)`;
      parts.push([ring, [{ opacity: 0 }, { opacity: 0, offset: from }, { opacity: 1, offset: min(from + 0.3, 0.98) }], { opacity: 1 }]);
    });
  }
  const frame = v => typeof v === 'string' ? { transform: v } : v;
  const runs = parts.map(([el, open, shut]) => { const a = el.animate([open, shut].flat().map(frame), { duration: 1000, fill: 'both', easing: EASE }); a.pause(); return a; });
  const go = rate => Promise.all(runs.map(a => {
    const t = a.currentTime || 0;
    if (rate > 0 ? t >= 1000 : t <= 0) return null;
    a.playbackRate = rate; a.play();
    return a.finished.catch(() => {});
  }));
  return { host, shut: ms => go(1000 / ms), open: ms => go(-1000 / ms) };
}

/**
 * The Book's turn, from curl() in PlaceTurns.kt: a leaf of [w] by [h] lies over [host], and its lower outer corner is
 * carried up and across to the far side. Short of the fold the leaf lies flat; past it the next leaf shows, and the part
 * lifted off lies back across the fold with its blank side up. Only transforms move: the fold is the edge of a turned
 * box, and what is inside it is turned back by the same amount. Returns the leaf to fill, and play(ms).
 */
function curlAway(host, w, h, paper) {
  const far = Math.hypot(w, h) * 2, pivot = make('place-fold', host), under = make('place-fold-under', pivot), clip = make('place-fold-clip', pivot);
  under.style.cssText = `top:${-far / 2}px;height:${far}px`;
  clip.style.cssText = `left:${-far}px;top:${-far / 2}px;width:${far}px;height:${far}px`;
  const flat = make('place-fold', clip), back = make('place-fold', clip), shade = make('place-fold-shade', clip), leaf = make('place-leaf', flat), blank = make('place-leaf', back);
  flat.style.cssText = back.style.cssText = `left:${far}px;top:${far / 2}px`;
  leaf.style.cssText = `width:${w}px;height:${h}px`;
  blank.style.cssText = `width:${w}px;height:${h}px;background:${paper};box-shadow:0 0 ${9 * D}px rgba(0,0,0,0.16)`;
  const at = [], un = [], flip = [];
  for (let k = 0; k <= 32; k++) {
    // The first pose is exactly flat: a hair of turn there resampled the held page, which looked blurred while it waited.
    const p = k / 32, dx = 2.08 * w * p, dy = 0.22 * h * sin(PI * p), turnBy = Math.atan2(dy, dx), x = w - dx / 2, y = h - dy / 2;
    at.push({ transform: `translate(${x}px,${y}px) rotate(${turnBy}rad)` });
    un.push({ transform: `rotate(${-turnBy}rad) translate(${-x}px,${-y}px)` });
    flip.push({ transform: `scaleX(-1) rotate(${-turnBy}rad) translate(${-x}px,${-y}px)` });
  }
  const shown = [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1 }];
  const runs = [[pivot, at], [flat, un], [back, flip], [under, shown], [shade, shown]].map(([el, frames]) => { const a = el.animate(frames, { duration: 1000, easing: EASE, fill: 'both' }); a.pause(); return a; });
  return { leaf, play: ms => Promise.all(runs.map(a => { a.playbackRate = 1000 / ms; a.play(); return a.finished.catch(() => {}); })) };
}

/** Fills [leaf], lying over [host], with the page as it stands there: the paper and frame under it, and a held copy of each of [parts]. */
function hold(leaf, host, w, h, parts) {
  const box = host.getBoundingClientRect();
  onto(make('', leaf, 'canvas'), w, h);
  for (const from of [backs[+night], frames?.[+night]]) {
    const r = from?.getBoundingClientRect();
    if (r?.width && from.width) { const k = from.width / r.width; X.drawImage(from, (box.left - r.left) * k, (box.top - r.top) * k, w * k, h * k, 0, 0, w, h); }
  }
  for (const part of parts) {
    const r = part.getBoundingClientRect(), ghost = part.cloneNode(true);
    ghost.inert = true; ghost.classList.add('place-ghost');
    ghost.querySelectorAll('.fade-in, .fade-out').forEach(n => n.classList.remove('fade-in', 'fade-out'));
    ghost.style.cssText = `left:${r.left - box.left}px;top:${r.top - box.top}px;width:${r.width}px;height:${r.height}px`;
    // A title keeps its own styling only inside a hero.
    if (part.matches('h1')) { const hero = make('screen-hero place-ghost', leaf); hero.style.cssText = ghost.style.cssText + ';padding:0;margin:0'; ghost.style.cssText = 'position:static;margin:0'; hero.append(ghost); }
    else leaf.append(ghost);
    ghost.scrollTop = part.scrollTop;
  }
}

/* ---- The page: the layers of the scene, and the frame on Read. ---- */
const html = document.documentElement, TABS = ['read', 'categories', 'search', 'bookmarks', 'about'];
const still = matchMedia('(prefers-reduced-motion: reduce)'), narrow = matchMedia('(max-width: 720px)');
// Android's FastOutSlowInEasing and SunsetEase.
const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)', DUSK = 'cubic-bezier(0.45, 0, 0.55, 1)', SUNSET_MS = 2200;
const make = (name, parent, tag = 'div') => { const n = document.createElement(tag); if (name) n.className = name; n.setAttribute('aria-hidden', 'true'); parent.append(n); return n; };
const wait = ms => new Promise(done => setTimeout(done, ms));

// Back to front. The sky stays where it is while the ground goes by under it, and it lies behind the ground: the sun
// goes down behind the dunes and the roofs. Of each pair the second is the night, faded in over the day.
const place = make('place', document.body); place.id = 'place'; place.hidden = true; document.body.prepend(place);
const backs = [make('place-back', place, 'canvas'), make('place-back', place, 'canvas')];
// The stars go by as the ground does (Android, 18 November); the sun and moon stand over them.
const starsEl = make('place-stars', place, 'canvas');
const dusk = make('place-dusk', place);
const bodies = [make('place-body', place), make('place-body', place)];
// The two lights' scenes are a group of their own, so while the light changes they can be added together: the day goes
// out exactly as the night comes in. Faded over a whole day scene, the night left the day's see-through light (the
// Sea's path, Hira's glow, Bab's wall, the mountain) showing, and it went in one step when the day was taken away.
const ground = make('place-ground', place);
const worlds = [make('place-world', ground), make('place-world', ground)];
const over = make('place-over', place), clearingEl = make('place-clearing', over), hush = make('place-hush', over);
const veil = make('place-veil', document.body);

const pageOf = key => TABS.indexOf(key) < 0 ? 4 : TABS.indexOf(key);
const here = () => { const path = location.pathname.replace(/\/$/, '').split('/').pop().replace(/\.html$/, ''); return path === '' || path === 'index' ? 'read' : path; };
let look = null, night = false, key = here(), before = key, page = pageOf(key);
let U = 3.2, BAND = 20, HEAD = 20, VW = 0, VH = 0, RES = 1, PX = 704;
let tiles = [[], []], lazy = 0, dusking = null, frames = null, frameBox = null, frameQueued = 0, turning = null, door = null, doorSerial = 0, shown = false;

function onto(canvas, w, h) {
  canvas.width = Math.round(w * RES); canvas.height = Math.round(h * RES);
  canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
  X = canvas.getContext('2d'); X.setTransform(RES, 0, 0, RES, 0, 0);
}
const blank = canvas => { canvas.width = canvas.height = 0; };

function measure() {
  VW = innerWidth; VH = innerHeight; PHONE = narrow.matches; RES = Math.min(devicePixelRatio || 1, 2);
  // A phone shows one screen of the place; a desktop window keeps the phone's scale and shows more of it either side,
  // until the window is so wide that the place would run out, and then the place grows with it.
  // Screens meet on whole device pixels (PX and the pan, see shift): at a fraction of one, in a zoomed or scaled
  // window, the browser left a hairline of the page showing between two screens.
  const dpr = devicePixelRatio || 1;
  PX = Math.round(Math.round(PHONE ? VW : Math.max(704, VW * PAGE / 640)) * dpr) / dpr; U = PX / PAGE;
  HEAD = BAND = (document.querySelector('.site-header')?.offsetHeight || 64) / U;
  // A desktop header is shallow, and Bab's battlements would stand behind its words; there the city starts a little lower.
  if (!PHONE && look === 'bab') BAND += 5;
}

function paintBack(n) {
  const c = TONES[look][n], s = SKY[look], W = VW / U, h = VH / U;
  if (look !== 'manuscript' && !s) return blank(backs[n]);
  onto(backs[n], VW, VH); X.scale(U, U);
  if (look === 'manuscript') { box(c.bg, 0, 0, W, h); openBook(c, !!n, BAND, h, page, W); return; }
  const end = BAND + s.depth;
  box(grad(0, 0, 0, end, (n ? s.dark : s.day).map(x => H(x))), 0, 0, W, end);
}

/**
 * The stars, wide enough for any walk along the tabs. Their pattern comes round every two screens, so the canvas is
 * slid to the place's position less whole rounds of it (starShift) and meets itself as it goes.
 */
const STARS_SPAN = 6;
function paintStars() {
  const s = SKY[look];
  if (!s) return blank(starsEl);
  // A desktop header is shallower than a phone's bar; there the stars reach a little lower so they do not crowd it.
  const depth = BAND + s.stars + (PHONE ? 0 : 24), W = VW / U + STARS_SPAN * PAGE;
  onto(starsEl, W * U, depth * U); X.scale(U, U);
  stars(depth, W, 1, [HEAD * 0.2, HEAD * 0.8]);
}
/** The stars' slide for the place at [at], taking off as many whole rounds of their pattern as [base] needs. */
function starShift(at, base = at) {
  const round = 2 * PAGE * U, px = a => VW / 2 - (a * PAGE + PAGE / 2 + PAGE) * U;
  const dpr = devicePixelRatio || 1, x = px(at) - Math.ceil(px(base) / round) * round;
  return `translateX(${Math.round(x * dpr) / dpr}px)`;
}

/** The place is drawn a screen at a time, each on its own canvas, so no canvas is ever larger than the window. */
function paintTile(n, i) {
  let tile = tiles[n][i + 1];
  if (!tile) { tile = tiles[n][i + 1] = make('', worlds[n], 'canvas'); tile.style.left = (i + 1) * PX + 'px'; }
  // The five tabs are a loop (owner, 18 November): six screens round, the five tabs and the one between About and
  // Read (5, which is also the screen before Read). Each scene draws that screen so it runs on from About and arrives
  // at Read's own first line (see ROUND): one continuous place, no fade. Beyond it the loop's copies stand.
  const j = (i % 6 + 6) % 6;
  if (tile.dataset.done === String(j)) return;
  slice(tile, n, j);
  tile.dataset.done = String(j);
}

/** One screen [j] of the place, onto [canvas]; 5 is the screen between About and Read. */
function slice(canvas, n, j) {
  const c = TONES[look][n], s = SKY[look], h = VH / U;
  onto(canvas, PX, VH); X.scale(U, U); X.translate(-j * PAGE, 0);
  X.beginPath(); X.rect(j * PAGE, 0, PAGE, h); X.clip();
  if (s) box(c.bg, L, BAND + s.depth, R - L, h);
  SCENE[look](c, !!n, BAND, h);
}

function paintWorld(n, at = page) {
  if (look === 'manuscript') return;
  const mid = at * PAGE + PAGE / 2, half = VW / U / 2;
  for (let i = Math.max(-3, Math.floor((mid - half) / PAGE)); i <= Math.min(7,Math.floor((mid + half - 0.01) / PAGE)); i++) paintTile(n, i);
}

/** The screens out of view are drawn one at a time while nothing else is happening. */
function fillIn() {
  clearTimeout(lazy);
  lazy = setTimeout(() => {
    if (!look || look === 'manuscript' || dusking) return;
    const n = +night, i = [-1, 0, 1, 2, 3, 4, 5].find(i => !tiles[n][i + 1]?.dataset.done);
    if (i === undefined) return;
    paintTile(n, i); fillIn();
  }, 150);
}

const shift = at => { const dpr = devicePixelRatio || 1; return `translateX(${Math.round((VW / 2 - (at * PAGE + PAGE / 2 + PAGE) * U) * dpr) / dpr}px)`; };
// At rest the sun or moon stands in the header: on a phone between the app's name and its buttons, on a desktop between the tabs and the buttons.
// Bab's wall runs past the middle of a wide window, so there they stand just clear of its end.
const restX = () => PHONE ? 122 : look === 'bab' ? min(VW / U / 2 + 137, VW / U * 0.8) : VW / U * 0.72;
const spot = (x, y) => `translate(${((x - 22) * U).toFixed(1)}px, ${((y - 22) * U).toFixed(1)}px)`;

function paintBodies() {
  bodies.forEach((body, moon) => {
    for (let low = 0; low < (moon ? 1 : 2); low++) {
      const canvas = body.children[low] || make(low ? 'place-low' : '', body, 'canvas');
      onto(canvas, 44 * U, 44 * U); X.scale(U, U); skyBody(!moon, 22, 22, low);
    }
  });
}

/** Everything standing still in the light it is in. */
function rest() {
  const s = SKY[look];
  backs[1].style.opacity = worlds[1].style.opacity = starsEl.style.opacity = +night;
  worlds[0].style.opacity = ''; worlds[1].style.mixBlendMode = '';
  if (frames) { frames[1].style.opacity = +night; frames[0].style.opacity = ''; }
  bodies.forEach((body, moon) => { body.style.opacity = s && !!moon === night ? 1 : 0; body.style.transform = spot(restX(), BAND * 0.56); });
  clearingEl.style.opacity = clearingFor();
  const other = +!night;
  blank(backs[other]); worlds[other].replaceChildren(); tiles[other] = [];
  if (frames) blank(frames[other]);
}

function draw() {
  if (!look) return;
  measure();
  worlds.forEach(world => { world.replaceChildren(); world.style.transform = shift(page); }); tiles = [[], []]; scenePage = page;
  const s = SKY[look], n = +night;
  paintBodies(); paintBack(n); paintWorld(n); paintStars();
  starsEl.style.transform = starShift(page);
  const clear = PHONE ? 150 : 200;
  clearingEl.style.cssText = `left:${VW / 2 - clear / 2 * U}px;top:${(BAND - 8) * U}px;width:${clear * U}px;height:${88 * U}px;opacity:${clearingFor()}`;
  // In the Sea, Bab and Court the wash falls off over a longer run, softly, with no line where it ends (AND-013).
  hush.style.cssText = `top:${BAND * U}px;height:${((s ? s.depth : 20) + 40) * (['bahr', 'bab', 'courtyard'].includes(look) ? 1.3 : 1) * U}px`;
  dusk.style.cssText = s ? `top:${(BAND + s.horizon - 62) * U}px;height:${88 * U}px` : 'display:none';
  rest();
  frameBox = null; layoutFrame();
  door?.host.remove(); door = null;
  fillIn();
}

/* ---- The frame the narration is read in. It runs from above the title to the foot of the narration. ---- */
const FOOT = { manuscript: 20, bahr: 10, bab: 8, courtyard: 26, waha: 20, hira: 30 };
const queueFrame = () => { cancelAnimationFrame(frameQueued); frameQueued = requestAnimationFrame(layoutFrame); };

function layoutFrame() {
  const main = document.querySelector('main.reader');
  if (!look || !main || main.hidden) return;
  const title = main.querySelector('.screen-hero h1'), reader = main.querySelector('.reader-main');
  if (!title || !reader || !reader.offsetWidth) return;
  if (!frames) {
    frames = [make('place-frame', main, 'canvas'), make('place-frame', main, 'canvas')];
    main.prepend(...frames);
    const watch = new ResizeObserver(queueFrame);
    watch.observe(reader); watch.observe(main.querySelector('.screen-hero'));
  }
  // The frame's top is the top of the title's margin, wherever the text box then puts the title.
  const foot = FOOT[look] * (reader.offsetWidth >= 520 ? 1.35 : 1);
  // offsetTop is measured from the nearest positioned box, which for the title is the hero, not the page.
  let titleTop = title.offsetTop;
  for (let box = title.offsetParent; box && box !== main; box = box.offsetParent) titleTop += box.offsetTop;
  const y = titleTop - parseFloat(getComputedStyle(title).marginTop), w = reader.offsetWidth, h = reader.offsetTop + reader.offsetHeight + foot - y;
  const next = { x: reader.offsetLeft, y, w, h, mw: main.clientWidth, top: main.offsetTop, vh: innerHeight };
  if (frameBox && Object.keys(next).every(k => next[k] === frameBox[k])) return;
  frameBox = next;
  D = w >= 520 ? 1.35 : 1;
  const [side, head, gap] = textBox(look, w, h);
  for (const [name, value] of [['side', side], ['top', head], ['gap', gap], ['foot', foot]]) html.style.setProperty('--frame-' + name, value.toFixed(1) + 'px');
  paintFrame(+night); frames[1].style.opacity = +night;
  if (dusking) paintFrame(+!night);
}

function paintFrame(n) {
  const f = frameBox;
  if (!f || !frames) return;
  onto(frames[n], f.mw, f.vh - f.top);
  // The palms by the tent you read in. On a phone they stand in the scene; a wide window would show them from the next page, behind its cards.
  if (look === 'waha' && !PHONE) { X.save(); X.scale(U, U); X.translate(f.mw / U / 2 - PAGE / 2, -f.top / U); tentPalms(!!n, f.vh / U); X.restore(); }
  X.translate(f.x, f.y);
  FRAMES[look](TONES[look][n], !!n, f.w, f.h);
}

/* ---- Light: day to night is a sunset, and night to day a sunrise. ---- */
function settle() {
  const run = dusking;
  if (!run) return;
  dusking = null;
  if (!run.flipped) run.flip();
  night = run.to;
  run.runs.forEach(a => a.cancel());
  rest(); fillIn();
}

/**
 * The light goes to night or day. [flip] changes the page's own colours; it is called when the page's text is out of sight.
 * True if the place took the change in hand.
 */
function sunset(toNight, flip) {
  if (!look) return false;
  if (dusking && dusking.to === toNight) return !dusking.flipped;
  settle();
  if (toNight === night) return false;
  if (still.matches || document.hidden) { flip(); night = toNight; draw(); return true; }
  const to = +toNight, s = SKY[look], time = { duration: SUNSET_MS, easing: DUSK, fill: 'both' };
  // The other light's scene is painted first, so the sunset itself only moves what is already there.
  paintBack(to); paintWorld(to); paintFrame(to);
  const fade = [{ opacity: +night }, { opacity: to }];
  // Added, not laid over: the day's scene goes out as the night's comes in (see ground).
  worlds[1].style.mixBlendMode = 'plus-lighter';
  const runs = [backs[1].animate(fade, time), worlds[1].animate(fade, time), starsEl.animate(fade, time),
    worlds[0].animate([{ opacity: 1 - +night }, { opacity: 1 - to }], time)];
  // The reading frame too: the day's goes out as the night's comes in, so nothing of it is left to go in one step.
  if (frames) {
    const frameTime = { duration: 700, delay: 300, easing: 'ease-in-out', fill: 'both' };
    runs.push(frames[1].animate(fade, frameTime), frames[0].animate([{ opacity: 1 - +night }, { opacity: 1 - to }], frameTime));
  }
  if (s) {
    // Whatever is in the sky sets to the right, behind the skyline; whatever is coming rises on the left.
    const high = BAND * 0.56, low = BAND + s.horizon + 24, x = restX(), W = VW / U, going = [], coming = [], glow = [], red = [];
    for (let k = 0; k <= 24; k++) {
      const t = k / 24, g = min(t / 0.62, 1), c = max((t - 0.38) / 0.62, 0);
      going.push({ transform: spot(x + (W + 26 - x) * g, high + (low - high) * g * g) });
      coming.push({ transform: spot(-26 + (x + 26) * c, low - (low - high) * (1 - (1 - c) * (1 - c))) });
      glow.push({ opacity: 0.5 * sin(t * PI) });
      red.push({ opacity: toNight ? g : 1 - c });
    }
    const [out, into] = toNight ? bodies : [bodies[1], bodies[0]];
    out.style.opacity = into.style.opacity = 1;
    runs.push(out.animate(going, time), into.animate(coming, time), dusk.animate(glow, time), bodies[0].children[1].animate(red, time));
  }
  // The words go out, change ink unseen, and come back; the place itself never leaves.
  const words = [...document.querySelectorAll('.site-header, .site-footer, .tabbar, main:not([hidden]) > :not(.place-frame, .place-turn)'), over];
  const outs = words.map(n => n.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 600, easing: 'ease-in', fill: 'forwards' }));
  const run = dusking = { to: toNight, flip, flipped: false, runs: [...runs, ...outs] };
  Promise.all(outs.map(a => a.finished)).then(() => {
    if (dusking !== run) return;
    flip(); run.flipped = true;
    outs.forEach(a => a.cancel());
    run.runs.push(...words.map(n => n.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: 100, easing: 'ease-out', fill: 'backwards' })));
  }).catch(() => {});
  Promise.all(runs.map(a => a.finished)).then(() => { if (dusking === run) settle(); }).catch(() => {});
  return true;
}

/* ---- Look: changing it fades out and in. ---- */
function refresh() {
  settle();
  if (turning) { turning.host.remove(); turning.reader.style.visibility = ''; turning = null; }
  door?.host.remove(); door = null;
  look = Object.hasOwn(PAL, html.dataset.look) ? html.dataset.look : null;
  night = html.classList.contains('dark');
  place.hidden = !look;
  if (!look) { backs.forEach(blank); worlds.forEach(world => world.replaceChildren()); tiles = [[], []]; frames?.forEach(blank); return; }
  draw();
  if (!shown && !still.matches) place.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: 'ease-out' });
  shown = true;
}

/** The look becomes [name] when [apply] runs. Into or out of a place, the page fades to its own ground, changes there, and fades back. */
function change(name, apply) {
  if (!Object.hasOwn(PAL, name) && !look) return apply();
  if (still.matches || document.hidden) { apply(); refresh(); return; }
  veil.style.background = getComputedStyle(html).getPropertyValue('--bg');
  veil.getAnimations().forEach(a => a.cancel());
  veil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-in', fill: 'forwards' }).finished.then(() => {
    apply(); refresh();
    veil.getAnimations().forEach(a => a.cancel());
    veil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-out' });
  }).catch(() => {});
}

/* ---- New Hadith: the old narration is held as it stood, the place shuts over it, and opens on the next. ---- */
function clipOf(w, h) {
  if (look === 'bab') { const g = gate(w); return `path('M${g.jamb} ${h}L${g.jamb} ${g.spring}A${g.inner} ${g.inner} 0 1 1 ${w - g.jamb} ${g.spring}L${w - g.jamb} ${h}Z')`; }
  if (look === 'hira') return `path('${caveShape(w, h)}')`;
  if (look === 'bahr') return `inset(0 round ${30 * D}px ${30 * D}px ${5 * D}px ${5 * D}px)`;
  if (look === 'courtyard') return `inset(0 round ${12 * D}px)`;
  return 'none';
}

function turn(loading) {
  const main = document.querySelector('main.reader'), f = frameBox;
  if (!look || !f || !main || main.hidden) return;
  if (look === 'manuscript') {
    // The book has no door to shut: the next leaf is laid ready under the held one, which then curls away.
    if (loading) {
      if (still.matches || document.hidden || !main.querySelector('.hadith-card.is-ready')) return;
      turning?.host.remove();
      const host = make('place-turn', main), reader = main.querySelector('.reader-main'), fold = curlAway(host, f.w, f.h, TONES[look][+night].surfaceSolid);
      host.style.cssText = `left:${f.x}px;top:${f.y}px;width:${f.w}px;height:${f.h}px`;
      hold(fold.leaf, host, f.w, f.h, [main.querySelector('.screen-hero h1'), reader]);
      turning = { host, reader, fold };
    } else if (turning) {
      const mine = turning;
      mine.fold.play(1150).then(() => { mine.host.remove(); if (turning === mine) turning = null; });
    }
    return;
  }
  if (loading) {
    if (still.matches || document.hidden) return;
    // A second change before the first has opened: the place shuts again from where it stands, with no picture to hold.
    if (turning) { turning.shut = turning.cover.shut(460); return; }
    if (!main.querySelector('.hadith-card.is-ready')) return;
    const host = make('place-turn', main), reader = main.querySelector('.reader-main'), ghost = reader.cloneNode(true);
    host.style.cssText = `left:${f.x}px;top:${f.y}px;width:${f.w}px;height:${f.h}px;clip-path:${clipOf(f.w, f.h)}`;
    ghost.inert = true; ghost.classList.add('place-ghost');
    ghost.querySelectorAll('.fade-in, .fade-out').forEach(n => n.classList.remove('fade-in', 'fade-out'));
    ghost.style.cssText = `left:${reader.offsetLeft - f.x}px;top:${reader.offsetTop - f.y}px;width:${reader.offsetWidth}px;height:${reader.offsetHeight}px`;
    host.append(ghost); ghost.scrollTop = reader.scrollTop;
    reader.style.visibility = 'hidden';
    const jamb = look === 'bab' ? gate(f.w).jamb : 0, cover = buildCover(host, f.w, f.h, D, +night, jamb, jamb && 7 * D);
    turning = { host, ghost, reader, cover, shut: cover.shut(460) };
  } else if (turning) {
    const mine = turning, shut = mine.shut;
    shut.then(async () => {
      if (turning !== mine || mine.shut !== shut) return;
      mine.ghost.remove(); mine.reader.style.visibility = '';
      await mine.cover.open(620);
      if (turning === mine && mine.shut === shut) { mine.host.remove(); turning = null; }
    });
  }
}

/* ---- The door: going into a category, a topic or a folder, and coming back out. ---- */
/**
 * Runs [fn], which changes what the screen shows, behind the place's door: the door shuts over the old screen, the
 * screens change unseen, and it opens on the new one. With [screen], only when that screen was already the one showing.
 * The door never takes a tap; a second change while it moves starts from where it stands.
 */
async function through(fn, screen) {
  if (!look || still.matches || document.hidden || (screen && before !== screen)) return fn();
  const mine = ++doorSerial;
  if (look === 'manuscript') {
    // The screen as it stood is held on a leaf; the next one is laid under it, and the leaf curls away.
    door?.host.remove();
    const host = make('place-door', document.body), top = document.querySelector('.site-header')?.offsetHeight || 0, h = VH - top - (PHONE ? document.querySelector('.tabbar')?.offsetHeight || 0 : 0);
    host.style.cssText = `top:${top}px;height:${h}px`;
    const fold = curlAway(host, VW, h, TONES[look][+night].bg), leafDoor = door = { host };
    hold(fold.leaf, host, VW, h, [document.querySelector('main:not([hidden])')]);
    try { await fn(); } finally {
      fold.play(900).then(() => { host.remove(); if (door === leafDoor) door = null; });
    }
    return;
  }
  if (!door) {
    const host = make('place-door', document.body), top = document.querySelector('.site-header')?.offsetHeight || 0, foot = PHONE ? document.querySelector('.tabbar')?.offsetHeight || 0 : 0;
    host.style.cssText = `top:${top}px;height:${VH - top - foot}px`;
    door = buildCover(host, VW, VH - top - foot, PHONE ? 1 : 1.35, +night);
  }
  const mover = door;
  await mover.shut(380);
  try { await fn(); } finally {
    if (mine === doorSerial) { await wait(90); if (mine === doorSerial) mover.open(620); }
  }
}

document.addEventListener('screenchange', event => {
  before = key; key = event.detail;
  const from = page; page = pageOf(key);
  if (look && from !== page) {
    if (look === 'manuscript') paintBack(+night);
    // A walk under way finishes first; the place then walks on to the latest tab (AND-004): started again from where it
    // was going, it jumped back mid-walk.
    else walks = walks.then(walkOn);
    clearingEl.style.opacity = clearingFor();
  }
  queueFrame();
});
/** The place walks from where it stands to the page now shown. */
let walks = Promise.resolve(), scenePage = page;
function walkOn() {
  const from = scenePage, to = page;
  if (!look || look === 'manuscript' || from === to) return;
  scenePage = to;
  // About to Read walks on into Read again, and Read to About walks back, through the loop's copies (paintTile).
  const via = from === 4 && to === 0 ? 6 : from === 0 && to === 4 ? -2 : to;
  const lights = dusking ? [0, 1] : [+night];
  lights.forEach(n => { paintWorld(n); if (via !== to) paintWorld(n, via); });
  const walk = PHONE ? { duration: 280, easing: 'ease-out' } : { duration: 650, easing: 'ease-in-out' }, runs = [];
  worlds.forEach(world => {
    world.style.transform = shift(to);
    if (!still.matches) runs.push(world.animate([{ transform: shift(from) }, { transform: shift(via) }], walk));
  });
  // The stars walk with the ground, on the same run; both ends take off the same whole rounds of their pattern.
  starsEl.style.transform = starShift(to);
  if (!still.matches) runs.push(starsEl.animate([{ transform: starShift(from, min(from, via)) }, { transform: starShift(via, min(from, via)) }], walk));
  fillIn();
  // Never waited on past its own length: in a tab the browser has put aside, animations may stop advancing.
  return Promise.race([Promise.all(runs.map(a => a.finished)).catch(() => {}), wait(walk.duration + 100)]);
}

let resized = 0;
addEventListener('resize', () => { clearTimeout(resized); resized = setTimeout(() => { if (look && (innerWidth !== VW || innerHeight !== VH)) { settle(); door?.host.remove(); door = null; draw(); } }, 150); });

refresh();
// While a turn is still shutting or opening (or the book's leaf curling), New Hadith waits for it (AND-001, AND-005).
return { turn, sunset, change, through, busy: () => !!turning };
})();
