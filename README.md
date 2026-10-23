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

- A random Sahih narration on a new visit, or on demand; reloads preserve the displayed narration
- Short excerpt cut at a **complete sentence** — never a faded half-line
- **Show full Hadith** reveals the complete text together with the Arabic, and
  only appears when there is genuinely something more to show
- Arabic in three typefaces: **Naskh**, **Clear** and **Bold**
- Three text sizes; light and dark themes that follow the system by default
- **Draw from** a grade: tap the grade pill to read only Sahih, only Hasan & Da'if, or ungraded narrations
- Every preference remembered between visits
- Laid out like the Android app on a phone (top bar, bottom tabs, docked actions); a side panel on a wide screen

**Bookmarking**

- Save any narration into folders you name — *Fasting*, *Prayer*, whatever helps you find it again
- Manage folders and saved Hadiths from the **Bookmarks** page: rename, delete, move between folders,
  or export any of them as a share card
- **Backup**: export, share or import a Hadith Pull library file, the same format the Android app reads
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
   New Hadith ──► │  pick a random offset │
                  │  over every hadith    │
                  └──────────┬───────────┘
                             ▼
                  data/v2/{collection}/{shard}.json
                             │
                             ▼
                  ┌──────────────────────┐
                  │ excerpt + reference  │
                  └──────────┬───────────┘
                             ▼
                  render ──► Share ──► canvas ──► PNG
```

The narrations use the Android app's shipped Sunnah.com bundle in `data/v2/`,
and are served as plain static files from this site — no
API call, no key, no network dependency at all beyond loading the page itself.
The draw is uniform over every eligible hadith in the dataset, not over
collections, so a book of 7,500 hadiths and a book of 40 don't come up equally
often. Anything that couldn't stand on its own — empty English, or a bare
cross-reference such as *"the same as above"* — was filtered out when the
dataset was built, so every draw at runtime succeeds.

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

No build step, no runtime dependencies, no package manager. The pages are plain
HTML and load the same stylesheet and scripts.

`card.js` exposes a single function and knows nothing about the DOM or the API:

```js
HadithCard.render(
  { english, arabic, narrator, collectionTitle, ref, primary, site, script, excerpt },
  'light' | 'dark'
) // → Promise<HTMLCanvasElement>
```

---

## Where the data comes from

Hadith, translations and grades are taken from **[Sunnah.com](https://sunnah.com/)**.
The files in `data/v2/` are copied byte-for-byte from the Android app's shipped
`app/src/main/assets/hadith/v2/` bundle, including its provenance, manifest,
audited legacy-key map, and reading pools. They are served from this domain;
there is no live third-party API call or API key.

| Collection | Hadiths |
|---|---|
| Sahih al-Bukhari | 7,227 |
| Sahih Muslim | 6,997 |
| Sunan Abi Dawud | 5,016 |
| Jami` at-Tirmidhi | 4,017 |
| Sunan an-Nasa'i | 5,723 |
| Sunan Ibn Majah | 4,338 |
| The Forty Hadith of al-Nawawi | 42 |
| The Forty Hadith Qudsi | 40 |
| The Forty Hadith of Shah Waliullah | 40 |

All 33,440 records keep their Sunnah.com URN as their identity. Display labels
can contain spaces, suffixes, groups or duplicates, so they are never used to
construct new identities or source links. Source links use `/urn/<id>`.
The 32,876 supported legacy keys resolve through `legacy.json`; missing or
excluded keys show an explicit error instead of an unrelated narration.

`tools/build-grades.mjs` uses the Android `pools.txt` to generate the small
`grades.json` discovery index. A `-` marks records excluded from discovery;
`s`, `o` and `n` mark eligible Sahih, other-graded and ungraded records.
New readers start with Sahih, and existing filter choices are preserved.
Direct links can still open records excluded from random discovery.

To update the dataset, copy the Android app's complete shipped v2 bundle into
`data/v2/`, run `node tools/build-grades.mjs`, update the data cache ID in
`sw.js` and `offline.js`, then run `node --test tests/*.test.mjs`. Those tests
verify every manifest hash, legacy mapping and shard boundary. Never copy the
raw SQL dump or audit staging files into the website. The historical `data/v1/`
bundle and its builder remain for older cached clients; the current reader
uses v2 exclusively.

**On the Arabic typefaces:** the dataset carries a single Arabic text, so the switch
changes the *typeface* only — all three render exactly the same characters.

| Setting | Font | Style |
|---|---|---|
| Naskh | Amiri | The classical book hand |
| Clear | Scheherazade New | Larger and rounder, fuller vowel marks |
| Bold | Noto Naskh Arabic | A denser cut, closer to the block-print style common in South Asia |

This is **not** a conversion to the Indo-Pak orthography of the printed Mushaf.
That orthography differs from standard Arabic in its spelling and diacritic
conventions — ھ against ه, small-alef placement, hamza seating — and reproducing
it needs both a differently encoded source text (the dataset carries one, standard
Arabic version, not an Indo-Pak-specific one) and a font built for it. The
community fonts that do reproduce it — Al Qalam, PDMS Saleem and similar — are
Pakistani freeware without clear terms for redistribution (Al Qalam's own
submission to Google Fonts under OFL was turned down for exactly this reason),
so none is bundled here. Bold is the closest a properly-licensed Google Font
gets to that denser, easier-to-read style.

---

## Design

- **English** — Cormorant Garamond, a serif that stays readable at size
- **Arabic** — Amiri, Scheherazade New or Noto Naskh Arabic
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

For a single promotional link, use **https://hadithpull.online/app/**. Android
visitors go to the Google Play listing; iPhone, iPad and desktop visitors go to
the website. This detects Android, since a browser cannot reliably determine
whether Google Play is installed. Shared narration links continue to use `/h/`.

## Android feature parity

Reading, grade filters, Arabic typefaces, text sizes, themes, folder management,
card exports and sharing follow the Android app. Library format v2 supports
URN keys in both directions; saved older bookmark snapshots are left intact.
About uses the Android copy with website-specific adaptations, plus licenses
and developer notes. Local font files keep the same typography offline.

**Offline:** About > Make available offline saves the shell, fonts and all
collections (about 65 MB). The service worker serves the last saved version
when offline and refreshes the shell online. Browsers may evict cached files;
bookmarks should be backed up through Export Library.

**Reminders:** the same Morning (07:00), Afternoon (15:00) and Night (21:00)
slots export daily calendar events with alarms, in local wall time. Users must
import the file and manage those events in their calendar. Android's background
notification actions, occasion-specific Hadith, fasting reminders, Hijri date
adjustment and home-screen widget stay in Android; the website links to the app
rather than promising those OS integrations in a browser.

**Mobile navigation:** long secondary pages scroll inside their main content
while the tabs remain in the page footer. This avoids depending on fixed-bottom
positioning as an embedded iOS browser moves its toolbar.


---

## Known limitations

- **Random access has no memory beyond bookmarks.** The same narration can
  come up twice, and there is still no history of what you've already read.
- **Bookmarks live in this browser only.** They're stored in `localStorage`,
  so there is still no account and nothing syncs across devices — clearing
  site data removes them.
- **The reading pool comes from the Android bundle.** Changes to standalone
  narration eligibility must be made in its classifier and shipped pools, then copied here.
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

Hadith, translations and grades are taken from [Sunnah.com](https://sunnah.com/).
The same font files as the Android app are bundled under their SIL Open Font licenses:
[Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond),
[Amiri](https://fonts.google.com/specimen/Amiri),
[Scheherazade New](https://fonts.google.com/specimen/Scheherazade+New),
[Noto Naskh Arabic](https://fonts.google.com/noto/specimen/Noto+Naskh+Arabic)
and [Inter](https://fonts.google.com/specimen/Inter).

Built by [aarahman04](https://github.com/aarahman04).
