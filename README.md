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
- **Choose how to read.** English opens with a short excerpt; Arabic mode shows
  the full Arabic narration. The header remembers the language you choose.
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
- Expanding and collapsing animate the text and its spacing together, without a pause or jump at the end
- **En / ع** in the Read header switches the current narration between English and Arabic without drawing another one
- Arabic mode shows the full Arabic text and translates collection names, references and supported grade labels; chapters stay English
- A narration without usable Arabic keeps its English text; unlisted collection and grade labels keep their English wording
- Arabic uses **Scheherazade New**, the former Clear face, throughout the reader, bookmarks and exported cards
- The appearance and typeface controls are removed; previously saved text sizes still apply
- Light and dark themes follow the system by default
- **Draw from** a grade: tap the grade pill to read only Sahih, only Hasan & Da'if, or ungraded narrations
- Every preference remembered between visits
- Laid out like the Android app on a phone (top bar, bottom tabs, docked actions); a side panel on a wide screen
- Only the narration scrolls; the heading and actions stay in place
- Read, Bookmarks and About preload and keep the current narration, expansion and scroll position; desktop pages fade gently and phone screens slide between tabs
- Left/right arrow keys cycle the three tabs; on phones, tap the bottom tabs or swipe horizontally. Vertical scrolling stays native
- Enter, N or + draws a narration; Ctrl/Cmd+C copies it when no text is selected
- **L** switches English / Arabic; shortcuts pause while typing or using a popup
- Space shows or hides the full narration and Arabic in English mode, unless a button or text field has focus; it does nothing in Arabic mode
- Up/down arrows, Page Up/Down and the mouse wheel scroll the narration smoothly; Home/End jump to its beginning/end
- A full-width **Keyboard shortcuts** button opens a centered popup on desktop; it is hidden on phones
- New Hadith avoids immediately repeating the narration already on screen
- What's new shows the newest note in full and keeps earlier versions in expandable rows

**Bookmarking**

- Save any narration into folders you name — *Fasting*, *Prayer*, whatever helps you find it again
- Manage folders and saved Hadiths from the **Bookmarks** page: rename, delete, move between folders,
  or export any of them as a share card
- **Backup**: export, share or import a Hadith Pull library file, the same format the Android app reads
- Stored entirely in this browser's `localStorage` — no account, no server, nothing synced
- Bookmark display, Copy and Share stay English regardless of the Read page's language

**Sharing**

- Export any narration as a **1080 × 1080** card, sized for an Instagram post
- Light or dark card, with an option to include the Arabic
- Arabic on the image card always uses Clear; the card's content and layout otherwise stay the same in both reading modes
- Native share sheet on mobile (the route that reaches WhatsApp, Instagram and
  the rest with the image attached), plus save to device and copy to clipboard
- Link shares to WhatsApp and Facebook, and copy the narration as plain text
- Reader Copy and text sharing follow the reading language, with the same URN-based Hadith Pull links and Sunnah.com URLs
- On phones, the share sheet and other bottom sheets close by dragging them down (or tapping outside)

**Offline reading and reminders**

- In **About**, choose **Make available offline** to save the website, fonts and all nine collections (about 65 MB)
- Download progress includes **Cancel**. You can stop and try again; already saved files and bookmarks are kept
- Completion appears in green and the button becomes **Available offline**; **Update offline copy** appears only when the saved version is older than the loaded website
- Export daily calendar reminders for Morning, Afternoon and Night, then import the file into your calendar
- Click anywhere in a reminder time field to open its native picker where supported; direct time entry stays available
- The Android app's download card is available in About on both phones and desktops

---

## Future features

These are the next two feature ideas. They describe the vision only; they are
not available yet, and their implementation and presentation are undecided.

**Hadith search and advanced search**

Find a Hadith by its name or by words someone remembers, even when they do not
know its number or collection. Advanced search should interpret what someone
types as they type and show relevant Hadiths. It should also offer ways to
describe what a Hadith is about or what it discusses, helping people find a
narration from its meaning or subject when they cannot remember the exact words.
Possible approaches include searching keywords in the existing dataset or using
a trained machine-learning model; no approach has been chosen. Whether search
gets its own section or a place in the header is still undecided.

**Topics and topic browsing**

Organize the Hadith dataset into carefully defined, precise topic sections so
people can browse or search a subject and find the relevant Hadiths together.
Examples include prayer, jealousy, time, appearance, worldly life and the
afterlife. These are subject categories, rather than grades or collections.
The aim is to make narrations about a particular topic easy to find. How these
sections will appear on the website will be decided later.

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

The narrations use the Android app's shipped Sunnah.com bundle in `data/v2/`.
The reader fetches the index and the required shards from this same domain as
needed, without a third-party API or API key. The optional offline download
saves all collections so future draws do not need a connection.
The draw is uniform over every eligible hadith in the dataset, not over
collections, so a book of 7,500 hadiths and a book of 40 don't come up equally
often. Anything that couldn't stand on its own — empty English, or a bare
cross-reference such as *"the same as above"* — was filtered out when the
dataset was built. A failed download shows a retry action rather than silently
replacing a shared narration with a different one.

The card is drawn on an HTML `<canvas>` at full resolution with **no libraries**.
Text is fitted by binary-searching the font size down until the wrapped block
fits its box. It uses the bundled fonts and creates the PNG on your device,
without loading third-party images.

---

## Project structure

```
.
├── index.html      Reader — the narration, controls and share dialog
├── bookmarks.html  Bookmarks — folders and saved narrations
├── about.html      What the project is, sources, a note on the Arabic
├── whats-new.html  Website release notes, linked from About
├── privacy.html    Privacy and local storage details
├── licenses.html   Bundled font licenses
├── contact.html    Message form (opens a pre-filled email; nothing is stored)
├── style.css       Design system: tokens, layout, both themes, responsive rules
├── script.js       Fetching, excerpting, rendering, preferences, share plumbing
├── navigation.js   Preloaded screens, desktop fades, browser history and tab navigation
├── card.js         Standalone canvas renderer for the 1080×1080 card
├── bookmarks.js    Folder/bookmark storage (localStorage) and the Bookmarks UI
├── offline.js      Optional offline download, progress and cancellation
├── sw.js           Same-origin offline caching and fallback
├── reminders.js    Local-time daily calendar reminder export
├── data/v2/        Shipped Sunnah.com data, manifest, reading pools and grades
├── fonts/          Bundled English and Arabic typefaces
├── licenses/       Original font license texts
├── app/index.html  Promotional link: Android to Google Play, others to the reader
├── h/index.html    Shared narration routing for Android and the website
├── tools/          Data and grade-index builders
├── tests/          Data integrity, identity, sharing, reminders and offline checks
├── favicons/       Icons and the web manifest
└── .github/
    └── workflows/  GitHub Pages deployment
```

No build step, no runtime dependencies, no package manager. The pages are plain
HTML and load the same stylesheet and scripts.

`navigation.js` keeps the three main screens mounted and initializes the shared
scripts once. Privacy, release notes, licenses and Contact join the same shell on
their first visit. Existing clean URLs and `.html` entry points still work;
offline-download and calendar helpers load independently so an optional script
failure cannot block the reader or navigation.
Browser Back/Forward switches screens without restarting the reader. If a main
screen cannot preload, links retain normal page navigation. The keyboard help is
included in the reader at startup. Its trigger is hidden by default and enabled
only on the desktop reader; the icon has explicit dimensions even before CSS loads. Shortcuts
pause while typing or using a popup; Enter and Space retain their normal behavior
on focused buttons and links, and selected text keeps the browser's normal copy.
Reduced-motion preferences disable screen transitions and animated scrolling.

`readingLanguage` stores `en` or `ar` in `localStorage`; missing or unknown values
use English regardless of browser language. Each entry page restores it before
first paint. `script.js` keeps the Arabic reference maps and text formatting pure;
the reader explicitly passes its language to Copy/Share, while bookmarks keep the
English default. Saved `textSize` values still apply. The old `arabicScript` key
is left untouched and is no longer read.

`card.js` exposes a single function and knows nothing about the DOM or the API:

```js
HadithCard.render(
  { english, arabic, narrator, collectionTitle, ref, primary, site, excerpt },
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

**Arabic typography:** Scheherazade New provides the former Clear face, with its
existing size and line height, for narrations and exported cards. Noto Naskh Arabic
draws the header's ع; Amiri remains bundled as a fallback. The dataset carries one
Arabic text, and switching the reading language never changes its characters.
The Indo-Pak orthography of the printed Mushaf is not included: it would require
a differently encoded source text and a suitable font.

---

## Design

- **English** — Cormorant Garamond, a serif that stays readable at size
- **Arabic narration** — Scheherazade New (Clear); Noto Naskh Arabic for the header's ع
- **Interface** — Inter
- **Light** — warm parchment `#f6f2ea`, ink `#1c1917`, gold `#a97e3c`
- **Dark** — deep ink `#0a0f14` with an emerald cast, `#5eead4` accent

The card uses the same palettes, so a saved image looks like the site it came
from. Everything on it hangs off two margins — the translation and its furniture
on the left, the Arabic on the right, where right-to-left text belongs.

The reading page fills the viewport on phones, tablets and desktops. The heading
sits above a scrollable narration pane. Actions stay
below it on phones; on wide screens the action card is centered beside that pane.
The New Hadith button and desktop keyboard-help button fill their rows, with
the reload icon and label centered together. On desktop, the collection and
Hadith number occupy separate lines, and the chapter stays on one line with an
ellipsis for longer titles. Hover to read the full chapter title; its complete
text also remains in the expanded reference. This keeps the action card steady
without blank space under shorter titles. Mobile references stay inline.
Browser toolbar height changes resize the reading pane rather than moving the
heading or bottom navigation.

The expanded reference stays in a rounded, opaque card. From 721px upward its header
has a divider, followed by one field per row with a 120px label column and subtle
row separators. Collection and Hadith number have stronger weight; chapter,
in-book and grades use softer text, with long values wrapping in their column.
The card sits 16px below Show less. Mobile card styling is unchanged.
The reference fades and lifts before hiding when Arabic closes, and New Hadith
fades the entire narration together so the reference cannot disappear abruptly.
Loading completion clears the exit fade on both success and failure, keeping
retry messages visible if a narration request fails.

Read, Bookmarks and About share heading sizes and top spacing. The language pill
has equal 32 × 26px segments inside a 72 × 44px hit area. En uses Inter at 12px;
ع uses Noto Naskh Arabic at 16px with a measured upward correction. The 22px
sun/moon glyphs are lifted 1px inside their unchanged 44px buttons.
English-to-Arabic keeps the 750ms wipe; Arabic-to-English stretches one connected
highlight across English before retracting from Arabic. Header actions fade on
page changes, and narration/reference text fades in place when the language changes.
Reduced motion skips these effects. The Read browser tab is titled **Hadith Pull**;
other tabs keep their page names, such as **Bookmarks** or **About**. The desktop header's green
highlight moves and resizes between tabs over the same 650 ms as the page fade.
Bookmarks omits its introductory subtext and
redundant empty-folder reading buttons. About uses compact offline and calendar
buttons with space around their text and a full touch target. Reminder time
fields use a compact 132px column aligned with their labels, retain a 44px touch
target, and keep 16px text to avoid focus zoom on phones. Page containers omit decorative focus borders; interactive
controls keep their keyboard focus indicators.

The desktop footer keeps the project sentence on the left, Sunnah.com at the
center and Privacy on the right. Secondary pages such as About scroll normally
on desktop and inside their content area on phones. Scrollbars are hidden across
the site, including pages, dialogs and action panels; wheel, touch and keyboard
scrolling remain available.

---

## Running it locally

Start a static file server:

```bash
git clone https://github.com/aarahman04/Hadith-Pull.git
cd Hadith-Pull
npx http-server -p 8080 -c-1
```

Then open `http://localhost:8080`. Opening `index.html` directly from the file
system mostly works, but `localStorage` and the clipboard behave differently
under `file://`, so a server is worth the extra step.

GitHub Pages resolves clean URLs such as `/about` to `/about.html`. If your local
server does not, open the subpages with their `.html` suffixes. Offline saving
needs HTTPS or localhost; test it through the server rather than `file://`.

## Validation

Run the regression checks with Node.js:

```bash
node --test tests/*.test.mjs
```

The tests cover dataset hashes and identities, supported legacy links, grade
filters and immediate-repeat prevention, bookmark import/export, reminder files,
Android routing, offline fallback, cancellation and retry, plus preloading,
preserved screen state, history navigation, desktop fades, mobile tab
slides and touch handling. Keyboard checks cover shortcuts, focus and selected-text behavior;
scroll checks cover repeated input, reduced motion and 60/120 Hz animation.
Language checks cover Arabic collection/grade maps, reference fallbacks,
mode-aware Copy/Share, missing Arabic, saved-language validation and the L shortcut.
Expansion checks cover interrupted animations, collapsing spacing, reference
exit fades, loading-error recovery and reduced motion. Offline checks also verify the completion state
after a download or reload.

For layout changes, also check a small phone, a phone in landscape and a wide
desktop in both themes. Switch reading languages with the header and L; confirm
the narration identity stays the same and Copy/Share use the chosen language.
Expand Arabic in English mode, scroll to the reference, draw another narration
and resize the browser. The heading and actions should stay in place; each new
narration starts at the top. Check the aligned reference rows at tablet widths too.
Check wheel, touch and keyboard scrolling, plus navigation on the secondary pages.
Cycle Read, Bookmarks and About without drawing a new narration; confirm the
Hadith, expansion, scroll position and heading alignment are preserved. Check
one-line and long chapter titles in the desktop card, and open the keyboard
popup with both the mouse and keyboard. Help should stay hidden on phones.
Test the iPhone in-app browser separately when a physical device is available.

## Deployment

Pushes to `main` run the regression tests and deploy to GitHub Pages via
`.github/workflows/static.yml` only if the tests pass. Check the workflow result
and the live reader on phone and desktop before treating a release as published.
The custom domain is configured in **Settings → Pages**; there is no `CNAME` file in the
repository.

When publishing shell changes, increment `OFFLINE_VERSION` in `offline.js`,
the script version in `navigation.js`, and the stylesheet/navigation query versions
in every main HTML page. This keeps cached CSS and navigation on the same release.
Update the matching shell-cache names in `sw.js` and `offline.js` as well; keep
the dataset cache tied to its dataset ID unless the data itself changes.
A completed download records that version
only after every file is saved. Existing or older completion markers offer an
update; matching versions show **Available offline**. Updates bypass the HTTP
cache, and cancellation keeps any previously completed copy.

For a single promotional link, use **https://hadithpull.online/app/**. Android
visitors go to the Google Play listing; iPhone, iPad and desktop visitors go to
the website. This detects Android, since a browser cannot reliably determine
whether Google Play is installed. Shared narration links continue to use `/h/`.

## Android feature parity

Reading languages, Clear Arabic typography, grade filters, themes, folder management,
card exports and sharing follow Android 1.8. The website retains saved text sizes
without exposing the removed appearance controls. Library format v2 supports
URN keys in both directions; saved older bookmark snapshots are left intact.
About uses the Android copy with website-specific adaptations, plus licenses
and developer notes. Local font files keep the same typography offline.

**Offline:** About > Make available offline saves the shell, fonts and all
collections (about 65 MB). The service worker serves the last saved version
when offline and refreshes the shell online. Browsers may evict cached files;
bookmarks should be backed up through Export Library.

Cancel stops the active download requests and restores the save button. A partial
download is not marked complete. A previously completed offline copy is kept.

**Reminders:** the same Morning (07:00), Afternoon (15:00) and Night (21:00)
slots export daily calendar events with alarms, in local wall time. Users must
import the file and manage those events in their calendar. Android's background
notification actions, occasion-specific Hadith, fasting reminders, Hijri date
adjustment and home-screen widget stay in Android; the website links to the app
rather than promising those OS integrations in a browser.

**Mobile navigation:** long secondary pages scroll inside their main content
while the tabs remain in the page footer. This avoids depending on fixed-bottom
positioning as an embedded iOS browser moves its toolbar. Change sections with
the bottom tabs or a horizontal swipe; phone screens slide between tabs without
wrapping past the first or last screen. Vertical scrolling remains native, and
screen scrollers reset accidental sideways panning. On phones, bottom sheets
also close by dragging down (`enableSwipeToClose` in `script.js`).

**Reading layout:** the heading and actions stay in
place on phones and desktops. Only the narration scrolls, with its scrollbar hidden.


---

## Known limitations

- **There is no reading history.** New Hadith excludes the currently displayed
  narration when another eligible choice exists, but older narrations can return.
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
