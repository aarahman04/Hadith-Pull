# Android 2.0 parity, 22 November 2026

This brings the website in line with Android 2.0 (versionCode 15). Every change below was pushed to `main` and deployed to hadithpull.online by the Pages workflow. The release token ended at `20261122-v2-8`.

## Looks
- The place looks use Arabic names: Kitab, Bahr, Bab, Sahn, Waha and Hira. Looks are stored by id, so a chosen look stays chosen.
- Bab's lamp cord now starts at a wooden pole in the street (`places.js`, `city`). Before, it began in mid-air, which showed on About.

## Light toggle
- The sun and moon share one place (`style.css`, `#theme-btn`). From the tap they turn once across the whole change of light, on the light's own curve: 1.3 s in Classic and 2.2 s through a place's sunset. The icons swap between 30% and 70% of the turn (`script.js`, `applyTheme`). This matches Android's `ThemeGlyphRoll`.
- In a place, the rest of the header still fades for the sunset, but the toggle stays in view (`places.js`, `sunset`).

## New Hadith
- The narration sinks 22 px over 560 ms. The skeleton fades in and stands at least 320 ms, and the next narration rises the same 22 px on the same curve (`script.js`, `NARRATION_OUT`, `MIN_DRAW_MS`; `style.css`, `rise`/`sink`).

## Chain of narration
- The link line and its bead share one centre, and the bead (6 px) sits above the line.
- With two routes or more, a trunk comes down from the Prophet ﷺ and branches into every route that starts with him. Routes start closed and slide open and shut (`narrators.js`, `chainPage`; `.narrator-fold`).
- The chain page fades in. Rows added by "Show more" fade in. Cards show no tap flash.
- The Read row's chain button stays put through New Hadith, as Recently read does. It goes only for a narration with no chain (`narrators.js`, `show`).

## About and What's new
- About has a "Chains of narration" block: where the chains, profiles and verdicts come from, how they were checked, and what is not yet reviewed.
- What's new has a 22 November note.

## Tabs
- Tabs slide at every width, as Android's do. The page slides a whole screen across in 420 ms, and the page leaving eases back to 96% and dims by a third (`navigation.js`, `slideScreens`).
- On a wide screen, a place pans its whole scene instead.
- The fade the owner keeps is New Hadith's, not the tab change.
- `tests/navigation.test.mjs` asserts the slide on phones and desktops.

## Release hashes
- `data/parity-manifest.json` must be rebuilt with `node tools/build-parity-manifest.mjs` whenever a hashed file changes (root HTML, JS and CSS, and data).
- Without the rebuild, the test "release data hashes cover every…" fails and the Pages deploy is skipped. That happened to every push between 12:54 and 15:23 UTC on 22 November, until the manifest was rebuilt.
