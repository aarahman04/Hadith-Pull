# Chains of narration and the owner's fixes (2026-11-18)

Release `20261118-chains-2` (was `20261117-places-1`). 

## Chain of narration and narrator profiles

- `tools/build-narrators.py` reads Android's `app/src/main/assets/science-of-hadith/narrators.db` (never edits it) and writes `data/narrators/v1/`: `index.json` (version, shard counts, 1,403 source works, 90 route notes, 10,652 names), `chains/0–255.json` by hadith number, `people/0–127.json` by an FNV-1a hash of the person id, `titles/0–31.json`. 417 files, 26.2 MB, about 3.9 MB gzipped. Every query mirrors Android's `NarratorRepository.kt` (order of verdicts, teachers and students by number of students, family labels, one source per link).
- `tools/sync-android.py` rebuilds the shards; `tools/build-parity-manifest.mjs` hashes them, so **Make available offline** saves them (the download is now about 120 MB).
- `narrators.js`: the chain button at the right of Read's row opens a full-page dialog. Chain: Prophet ﷺ, each narrator with the word of transmission, gap markers and names without a profile labelled as on Android, the compiler, the route's end note; several routes fold. Profile: chips, "What the critics said", About, "In this report", "Learned from" / "Taught" twenty at a time, the hadith the person carried, family, sources with editions. Wording copied from `ScienceOfHadithScreen.kt`.
- Not ported: the chain link in Search, Categories and Bookmarks sheets; the Narrators tree and search; "The method" page (`ScienceCopy.kt`).

## Read's row

- Every look uses Classic's row: Recently read at the left edge, the full "Hadith of the moment" with its lines, the chain at the right edge, at Classic's distances on every width (9px from the window on a phone). In the place looks both icons take the full ink with a glow of the page colour, never a box. Narrow phones set the label smaller so it is never cut.
- The place looks no longer move the row into the side panel on a wide window.

## Looks

- The picker offers Classic (still the default) and the six places. Mushaf, Iznik, Mihrab, Riyad and Kufic stay in `style.css` for anyone who chose one.
- Right-click (desktop) or a long press (phone) on the sun or moon opens Appearance as cards, as Android's look sheet: System / Light / Dark and the seven looks drawn in the mode in use. It stays open while looks are tried.

## Tabs

- The five tabs are a loop: About → Read is a step forward and Read → About a step back, by click, keys or swipe.
- A place look slides whole pages on every width, with the ground panning under them. A tab change waits for the running slide or fade; a second tap meanwhile is ignored.
- `places.js`: the place is six screens round: the five tabs and the screen between About and Read, which is also the screen before Read. Each scene draws that screen so it runs on from About and arrives at Read's own first lines, one continuous place with no fade: Sea's mountain runs to Read's first wall of water, which stands again at the loop's end; Bab's lane ends at the city wall's end face; Court's garden gives way to the arcade and its brick; Oasis's dunes and grass bend into Read's (`round()`); Hira's dark lifts towards the mouth and its brow (`arriving()`). Book turns page by page and has no scene to carry.
- Read's own styles hang on its `main` (`main.page-read`), so Read keeps its frame and About keeps its title while either slides out.

## Other fixes

- The place-look frame rules had been broken by a selector edit and drew the narration frame against the page; repaired.
- Categories: The Noble Qur'an is the large card first, the Prophet ﷺ beside it (website only; the arrangement file is unchanged). Search's Browse shows every card the same size. Eyebrows: Categories "Browse", Search "Find a Hadith".
- About: Appearance runs down beside Offline reading and Notifications, closing the gap under Offline reading.
- Sea's Categories has weed, shells and pebbles on its path, so it differs from Read. An earlier version with drawn figures was removed at the owner's request.
- `tools/serve.py` sends `Cache-Control: no-store`. A browser that kept the old release's files showed stale code; the release bump fixes that for visitors.

## Android (same day)

- Tabs loop: `AppNav.wrapTo` slides the open tab out and the next in from the other side while the place walks two screens on, through the same screen between About and Read; `TabSwipeInput` reports a swipe past either end. `LookScenes` draws the place six screens round with the same continuations as the website (`ROUND`, `round()`, `arriving()`).
- Recently read and chain icons take the full ink in the place looks. The loading skeleton centres in a look whose narration is centred.
- Compiles; unit tests pass. Installed on the owner's phone over Wi-Fi; the wrap itself was not filmed.

## Owner's review of the loop, later the same day

- Hairlines through the scenes (Oasis, Sea, Hira): the place is drawn a screen per canvas, and in a zoomed or scaled window two canvases met at a fraction of a device pixel. Screens are now a whole number of device pixels wide and the pan lands on whole device pixels, so they meet exactly. An overlap tried first doubled the see-through sky (a band beside the moon) and was removed.
- Hira: the light coming back towards the mouth is one layer under one smooth mask (it had been drawn in slices, which showed as stripes); the rock seams bend across the screen after About to meet themselves at Read (diagonal runs, no vertical strokes); the roof there stays plain, with no peaks under the bar, and dips only at the end to meet the mouth's brow; the boulder at the mouth has its other half there.
- Sea: the mountain is drawn before the walls of water, so it ends behind Read's first wall instead of across it. The light down the path was painted in a box that began at Read's edge, a step in the sky; it is now painted whole, and again where the loop reaches Read.
- Bab: the street's light was painted a screen at a time, restarting at each, which showed as an edge at every screen from Categories to About; it is now one light along the whole street.
- Hira: the roof's lower edge is rough rock, not a ruled line under the bar.
- Book: before New Hadith turns the leaf, the held page waited at a hair of a turn, which resampled it and looked blurred; it now waits exactly flat. Its held title no longer takes the frame's side padding, which nudged it right.
- Hira: the roof edge is a gentle, slow wave (a finer one looked bumpy under the bar), and the hanging rock begins past Read, so Read's bar is clear. Bab: the lamps' cord no longer stops in the air at About's edge; it runs on down the lane to the city wall's end face.
- Hira: the roof now reaches just below the bar on every tab and starts under the end of the mouth's brow (a strip of lighter rock had shown under the bar from Read to About).
- Android: the wrap is one swipe-like motion, the open tab gathering speed as it leaves and the next slowing as it settles (0.82 s for its two screens); installed on the owner's phone.
- Release bumped again to `20261118-chains-2`: the offline worker had kept earlier copies of today's files under `-chains-1`.
- About to Read: About hides the footer, and it still counted as shown while sliding away, so Read jumped when the footer came back. The rule now ignores a page that is sliding out.
- Android: the wrap takes 1.1 s for its two screens (it felt rushed at 0.56 s); pages sit on whole pixels; the same Hira mask, seams and boulder, and the Sea range behind the walls.

## Checked

- 122 web tests. Headless Chrome at 1920, 1440, 1280, 1100, 390 and 360 px in all seven looks: full label, icons level and symmetric, frame on the column. Every look's About↔Read swipe frozen halfway: titles keep their size and colour. Every place halfway through About → Read on desktop, and Oasis on a phone: the scene runs on unbroken. Bukhari 1's chain and Sufyān ibn ʿUyaynah's profile in the browser; long press simulated in both event orders.

## Not checked

- Real phones, Safari and Firefox. A long chain, Shuʿbah's profile and a gap marker were covered by the data tests, not looked at on screen. The Android wrap on a device.
