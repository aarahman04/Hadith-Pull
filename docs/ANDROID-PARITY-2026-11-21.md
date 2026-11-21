# Android parity, 21 November 2026

What the Android app changed on 18 to 21 November, and what the website does about each item. Android sources: commits `edcf142`, `dec954f`, `b10abb9` and `1599ef7` in `Hadith-Pull-Android`, its `docs/PROGRESS.md`, `docs/Hadith_Pull_Android_Bug_Tracker.md` (AND-001 to AND-020) and `docs/Hadith_Pull_Web_Porting_Changelog.md`. Parity means the same behaviour and the same identity for each look, not the same pixels: the web keeps browser layouts, hover and keyboard focus.

Status key: **to do**, **done** (changed on the web and checked in a browser), **already right** (the web did not have the fault), **Android only** (nothing to port), **open** (not done yet; reason given).

## Part 1: the 18 November work (light, stars and the Read row)

| # | Android change | What the web does now | Web status |
| --- | --- | --- | --- |
| L1 | Day and night scenes truly cross-fade in every place (the day goes out as the night comes in). Before, the day scene stayed whole under the night one, so anything see-through in it (the Sea's light down the path, Hira's light, Bab's wall glow, About's mountain light) showed through the night and went in one step when the day scene was dropped at the end, or came in one step at the start. | Same fault: `places.js` `sunset()` fades `worlds[1]` (night) over `worlds[0]` (day) left whole, and `rest()` then drops the day world in one step. | to do |
| L2 | Stars go by with a swipe, as the ground does, and fade star by star with the night. Their pattern repeats every two screens, so they meet themselves round the six-screen loop. The sun and moon stand over them. | Stars are painted into the fixed night sky (`paintBack`), so they fade with it but stand still while the place walks. | to do |
| L3 | In the Sea, a soft sand glow behind Recently read and the chain on Read, dark at night, changing with the sunset. | The web's Read row sits on the Sea's page differently; to be checked by eye. | to do (check first) |
| L4 | The language pill's "En" is set in Inter in every look, as in Classic: in the places' serifs it read smaller than ع. | To be checked. | to do |
| L5 | The chain icon is drawn at 0.92 so it stands as tall as the clock (Recently read). | The web has the older single pair of links (Android's comment says so). | to do (check) |
| L6 | "CC BY 4.0" in the chain credit never breaks across lines. | To be checked. | to do |
| L7 | Read from: Bookmarks is one row that drops down to All bookmarks and every folder. | Lists every folder under its own heading. | to do |
| L8 | Seven looks offered: Classic and the six places. | The web picker already offers these seven. | already right |
| L9 | The door into a card or topic takes its picture as the screen changes (the back gesture showed the next screen before the door shut). | The web door covers the live page and changes it under the cover (`through`), so it has no picture to miss. | already right (to confirm by eye) |
| L10 | The tabs are a real loop; About to Read is an ordinary swipe. | The web walks the loop on tab change (`screenchange`, via 6 and -2). | already right |

## Part 2: the 20-issue release (AND-001 to AND-020)

| ID | Issue | What the web does now | Web status |
| --- | --- | --- | --- |
| AND-001 | New Hadith waits for the place's turn | To be checked against `places.js turn()` and `script.js draw()` (`isFetching`). | to do |
| AND-002 | Every narration of a topic once before any repeat | `pickRecord()` takes a fresh random pick each time. | to do |
| AND-003 | Primary buttons ink with on-primary; three night primaries darkened (Sea #198095, Court #2A7E5A, Oasis #2A804E) | To be checked in the `style.css` LOOKS block. | to do |
| AND-004 | Tab taps queued, never turned round mid-move | The web changes page per tab; to be checked where a swipe or walk is running. | to do (check) |
| AND-005 | The book never turns a stale leaf | To be checked against `curlAway`/`turn`. | to do (check) |
| AND-006 | Narrations shown whole; no "Show full Hadith" excerpt on the reading page (owner ruling) | `script.js` collapses long narrations to an excerpt (`buildExcerpt`, `PAGE_EXCERPT`). | to do |
| AND-007 | Topic and grade together; a plain empty state, never another grade | `Parity.sourceCandidates` falls back to any grade when none matches. | to do |
| AND-008 | Ramadan its own card; `extraTopics` and `except` in the arrangement | The web's `data/topics/arrangement.json` differs from Android's; taxonomy and labels are the same. | to do |
| AND-009 | A tab is entered from its top | To be checked (separate pages may already open at the top). | to do (check) |
| AND-010 | Categories does not rise again on coming back | To be checked. | to do (check) |
| AND-011 | Read from rows: accent-soft fill on press and keyboard focus, no pale slab | To be checked. | to do |
| AND-012 | Sea: lighter clearing and scrolled wash, lighter at night | `CLEARING` and the hush in `places.js`. | to do |
| AND-013 | Sea: the scrolled wash fades out softly, no seam | As above. | to do |
| AND-014 | Bab: clearing 0.9 to 0.7, wash 0.95 to 0.82 | As above. | to do |
| AND-015 | Court ("Core"): same as Bab | As above. | to do |
| AND-016 | Hira by day: the reference card is dawn-lit paper | To be checked. | to do |
| AND-017 | Folder narrations as the topic list's cards | To be checked in `bookmarks.js`. | to do |
| AND-018 | Hira by day: the Share sheet takes the page's colour | To be checked. | to do |
| AND-019 | Share preview: short fade, latest choice wins, exports held until drawn | To be checked in `card.js`. | to do |
| AND-020 | Classic Dark thumbnail and caption on Android | The web's Classic has stars and keeps them. | Android only |
| (owner) | Classic's leaving narration sinks 22 px as it fades, 700 ms, one ease-in-out curve, height held; the next waits for it | To be checked against `setLoading`. | to do |
| (owner) | Portrait lock | Nothing to lock on the web. | Android only |

## Part 3: the web's own layout

The handoff of 21 November also asks that the web not be held in Android's phone-shaped boxes: on a wide window the reading page should use the width with a comfortable line length, and each look keep its identity. That is a design change of its own and is recorded here once the parity work above is done.

## Log

- 21 November: this checklist written from the Android code and docs. Work follows in the order Part 1, Part 2, Part 3.
- 21 November, progress (uncommitted, not pushed):
  - Done and checked in a browser: L1 (true day/night cross-fade, `plus-lighter` in `.place-ground`; reading frame too), L2 (stars on their own layer, walking with the ground), L7 (Bookmarks drop-down in Read from), AND-016 (Hira cave-mouth cards on paper), AND-008 (Ramadan card; `extraTopics` and `except` in `Parity.Categories`; art and short titles from `tools/export-category-art.py`, whose block bounds were fixed).
  - Done in code, tests pass: AND-002/007 (`Parity.nextInRound`, quiet empty state), AND-006 (whole narration on the reading page), AND-003 (three dark primaries), AND-012 to 015 (clearing and wash), AND-011, AND-017 (folder cards are topic cards), AND-019 (exports held until drawn, 220 ms fade), AND-001/005 (`Places.busy()`), AND-004 (scene walks queued), L6, Classic's 700 ms sinking exit.
  - Already right: L4 ("En" already Inter), AND-018 (share sheet uses the look's colour).
  - Wider reading frame (owner): from 721 px every place frame may grow to 820 px, and on wide windows the side panel takes 640 px. Good in Sea and Hira at 1440×900. Open: Bab's arch is a half-circle sized to the width, so a wider gate starts its text lower; Bab may need its own width or a flatter arch. Book, Court and Oasis not yet looked at; phones not re-checked.
  - Still to do: L3 (Sea glow, check by eye), L5 (chain icon), AND-009, AND-010, the AND-004 walk queue checked with the pane visible, rebuild `data/parity-manifest.json` (`node tools/build-parity-manifest.mjs`), release id in `sw.js`, commit and push.
- 22 November, finished and released as `20261122-parity-1`:
  - Wider frame checked in all six places at 1440×900 (Book, Sea, Bab, Court, Oasis, Hira): the narration now shows whole or nearly so. Bab keeps its round arch; at 800 px its frame shows 72% of a long narration against 50% at 620 px, so the wider gate stays. The side panel was given 16 px more. At 1024×768 the place frame matches Classic (820×184 against 780×186, both with the panel below); phones unchanged.
  - AND-009: a tab left for another tab is entered again from its top (`navigation.js`); a card or folder inside a tab keeps its place.
  - AND-004: the scene's walk queue never waits past a walk's own length (a tab in the background may stop animations).
  - Already right on the web: AND-010 (tabs stay mounted, Categories is not rebuilt), L3 (the Read row icons already carry a page-coloured glow that changes while the words are out), L5 (chain and clock look the same size).
  - Tests: 124/124 (`node --test tests/*.test.mjs`); the folder-list and navigation tests were updated to the new cards and the AND-009 rule. `data/parity-manifest.json` rebuilt.
  - Not checked: Safari and Firefox (`mix-blend-mode: plus-lighter` is newer there; without it the cross-fade dims a little mid-way instead), animation timing with the browser pane visible, TalkBack/VoiceOver.
