# Hadith Pull

A quiet place to read one narration at a time.

**Live at [hadithpull.online](https://hadithpull.online)**

Hadith Pull draws a random narration from nine major collections and presents it
with its full reference attached — the collection, the hadith number, the
chapter and the grading reported by the source. Any narration can be exported as
a shareable square card that carries that reference with it.

---

## The aim

Most places you encounter a hadith online give you the text and nothing else. It
arrives stripped of its source, and there is no way to check it without going
looking. Screenshots make this worse: they travel further than anything, and
they usually carry the least context.

This project starts from the opposite position.

- **The reference travels with the text.** On the page, in the copied text, and
  printed on every exported card. If someone receives a card from you, they can
  go and verify it.
- **The translation leads.** A narration opens as a short excerpt in English.
  The Arabic and the full text are one tap away, not stacked in front of you.
- **Nothing is dressed up.** Gradings are reproduced exactly as the source
  reports them, including weak ones. A card whose narration did not fit is
  marked *excerpt* rather than implying it holds the whole thing.

It is a small static site with no backend, no accounts and no tracking.

---

## Features

**Reading**

- A random narration on every visit, or on demand
- Short excerpt cut at a **complete sentence** — never a faded half-line
- **Show full Hadith** reveals the complete text together with the Arabic, and
  only appears when there is genuinely something more to show
- Arabic in three typefaces: **Naskh**, **Clear** and **Nastaliq**
- Three text sizes; light and dark themes that follow the system by default
- Every preference remembered between visits

**Bookmarking**

- Save any narration into folders you name — *Fasting*, *Prayer*, whatever helps you find it again
- Manage folders and saved Hadiths from the **Bookmarks** page: rename, delete, move between folders,
  or export any of them as a share card
- Stored entirely in this browser's `localStorage` — no account, no server, nothing synced

**Sharing**

- Export any narration as a **1080 × 1080** card, sized for an Instagram post
- Light or dark card, with an option to include the Arabic
- The card follows whichever Arabic typeface you are reading in
- Native share sheet on mobile (the route that reaches WhatsApp, Instagram and
  the rest with the image attached), plus save to device and copy to clipboard
- Link shares to WhatsApp and Facebook, and copy the narration as plain text

---

## How it works

```
                  ┌──────────────────────┐
   New Hadith ──► │  pick a collection   │
                  │  pick a random no.   │
                  └──────────┬───────────┘
                             ▼
                     hadithapi.com
                             │
                             ▼
                  ┌──────────────────────┐
                  │ usable narration?    │──no──► draw again (up to 10x)
                  └──────────┬───────────┘
                             ▼ yes
                  ┌──────────────────────┐
                  │ excerpt + reference  │
                  └──────────┬───────────┘
                             ▼
                  render ──► Share ──► canvas ──► PNG
```

Each collection has a known number of hadiths, so a random number within that
range is requested directly. A narration is redrawn when it is empty, or when it
is only a **cross-reference** — collections are sequences, and some entries carry
no text of their own beyond *"the same as above"* or a second chain of narrators
for the hadith before them. Pulled out at random those point at nothing, so they
are skipped.

The card is drawn on an HTML `<canvas>` at full resolution with **no libraries**.
Text is fitted by binary-searching the font size down until the wrapped block
fits its box. There is nothing to download and no cross-origin tainting, so the
canvas exports cleanly to PNG everywhere.

---

## Project structure

```
.
├── index.html      Reader — the narration, controls and share dialog
├── bookmarks.html  Bookmarks — folders and saved narrations
├── about.html      What the project is, sources, a note on the Arabic
├── contact.html    Message form (opens a pre-filled email; nothing is stored)
├── style.css       Design system: tokens, layout, both themes, responsive rules
├── script.js       Fetching, excerpting, rendering, preferences, share plumbing
├── card.js         Standalone canvas renderer for the 1080×1080 card
├── bookmarks.js    Folder/bookmark storage (localStorage) and the Bookmarks UI
├── favicons/       Icons and the web manifest
└── .github/
    └── workflows/  GitHub Pages deployment
```

No build step, no dependencies, no package manager. The three pages are plain
HTML and load the same stylesheet and scripts.

`card.js` exposes a single function and knows nothing about the DOM or the API:

```js
HadithCard.render(
  { english, arabic, narrator, book, number, status, site, script, excerpt },
  'light' | 'dark'
) // → Promise<HTMLCanvasElement>
```

---

## Where the data comes from

Narrations are fetched live from **[HadithAPI](https://hadithapi.com)**, which
draws on these collections:

| Collection | Hadiths |
|---|---|
| Sahih Bukhari | 7,563 |
| Sahih Muslim | 3,033 |
| Jami' at-Tirmidhi | 3,956 |
| Sunan Abu Dawood | 5,274 |
| Sunan Ibn Majah | 4,341 |
| Sunan an-Nasa'i | 5,758 |
| Mishkat al-Masabih | 6,294 |
| Musnad Ahmad | 28,199 |
| Al-Silsila Sahiha | 4,035 |

The API returns the English translation, the Arabic, the narrator, the chapter
and the grading. Gradings are shown as reported — `Sahih`, `Hasan`, `Da'if` or
unclassified — and are colour-coded rather than filtered.

**On the Arabic typefaces:** the API returns a single Arabic text, so the switch
changes the *typeface* only — all three render exactly the same characters.

| Setting | Font | Style |
|---|---|---|
| Naskh | Amiri | The classical book hand |
| Clear | Scheherazade New | Larger and rounder, fuller vowel marks |
| Nastaliq | Noto Nastaliq Urdu | The sloping calligraphic style read across South Asia |

This is **not** a conversion to the IndoPak orthography of the mushaf. That
orthography differs from standard Arabic in its spelling and diacritic
conventions — ھ against ه, small-alef placement, hamza seating — and reproducing
it needs both a differently encoded source text and a licensed IndoPak font.
Neither is available here, so the honest offering is a choice of letterforms.
Nastaliq is the closest thing to the script a reader in the subcontinent will
recognise.

---

## Design

- **English** — Cormorant Garamond, a serif that stays readable at size
- **Arabic** — Amiri, Scheherazade New or Noto Nastaliq Urdu
- **Interface** — Inter
- **Light** — warm parchment `#f6f2ea`, ink `#1c1917`, gold `#a97e3c`
- **Dark** — deep ink `#0a0f14` with an emerald cast, `#5eead4` accent

The card uses the same palettes, so a saved image looks like the site it came
from. Everything on it hangs off two margins — the translation and its furniture
on the left, the Arabic on the right, where right-to-left text belongs.

---

## Running it locally

Any static file server will do:

```bash
git clone https://github.com/aarahman04/Hadith-Pull.git
cd Hadith-Pull
npx http-server -p 8080 -c-1
```

Then open `http://localhost:8080`. Opening `index.html` directly from the file
system mostly works, but `localStorage` and the clipboard behave differently
under `file://`, so a server is worth the extra step.

## Deployment

Pushes to `main` deploy to GitHub Pages via `.github/workflows`. The custom
domain is configured in **Settings → Pages**; there is no `CNAME` file in the
repository.

---

## Known limitations

- **The API key is in the client.** It is a static site with no backend, so the
  key is visible in `script.js` to anyone reading the source. If it is ever
  abused or rate-limited, the fix is a small proxy (a Cloudflare Worker or
  Netlify function) that holds the key server-side.
- **Random access has no memory beyond bookmarks.** The same narration can
  come up twice, and there is still no history of what you've already read.
- **Bookmarks live in this browser only.** They're stored in `localStorage`,
  so there is still no account and nothing syncs across devices — clearing
  site data removes them.
- **The cross-reference filter is heuristic.** It matches known phrasings in
  short entries. Something may still slip through; adding a pattern to
  `CROSS_REFERENCE` in `script.js` is a one-line change.
- **Long narrations are excerpted on the card.** Two hundred words shrunk to fit
  a square is not readable, so the card carries the excerpt and says so.

---

## A note on the texts

This is a personal project, not a scholarly reference. Translations and gradings
are reproduced from the source as they are given. For anything you intend to act
on or pass along, verify it against the printed collection or ask someone
qualified.

---

## Credits

Texts via [HadithAPI](https://hadithapi.com). Typefaces from Google Fonts:
[Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond),
[Amiri](https://fonts.google.com/specimen/Amiri),
[Scheherazade New](https://fonts.google.com/specimen/Scheherazade+New),
[Noto Nastaliq Urdu](https://fonts.google.com/noto/specimen/Noto+Nastaliq+Urdu)
and [Inter](https://fonts.google.com/specimen/Inter).

Built by [aarahman04](https://github.com/aarahman04).
