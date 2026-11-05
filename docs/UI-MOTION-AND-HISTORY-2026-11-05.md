# Motion, history and header follow-up — 5 November 2026

This follow-up supersedes the earlier footer and history presentation notes.

- Search/Describe keeps the connected stretch-and-settle fill. English/Arabic restores its original Arabic reveal from the right and connected return. Both pills, plus light/dark, ignore further input until their motion completes. Web locks wait for animation completion; Android follows the Compose transition and theme-glyph rotation rather than a separate timer.
- Search/Describe on web crossfades the old and new contents without a second input border. Its filter control is inside the Describe bar, with an animated panel. Search and Describe omit local-index helper copy and closest-match/missing-term notes; ranking and source data are unchanged.
- Read fades the complete reference dock while loading. Decorative quotation marks start hidden, begin a 600 ms fade 500 ms after the narration appears, and leave with the outgoing narration. The extra Read subtitle is removed.
- The extra in-book row is removed from Read and narration reference cards on both platforms. Arabic source links say عرض المصدر. Web Arabic puts the reference on the right and grade on the left. The desktop panel follows English's three-line structure: reference, chapter, then source link, all aligned right in Arabic. Responsive web and Android use the compact footer row with Arabic source left and chapter right. Android retains its reference-header order and reserves 34 dp for either language's font metrics. Card/dock geometry stays unchanged across languages. Chapter text no longer produces the stray native hover tooltip.
- References and the New Hadith/Copy/Save/Share controls crossfade together over 650 ms. Android Arabic action labels use a modest 14.5 sp semibold style within the existing button heights.
- Recent query removal fades and collapses before updating stored history on both platforms.
- Recently read has a fixed-height sheet through loading and resolution. Desktop web uses a compact list; mobile web and Android retain individual compact rounded cards matching their 104 px/dp skeleton layout. Each has a full-width excerpt below the history icon, collection/number and grade header. Mobile Close controls are compact. Android fades loaded cards in over 600 ms and gives the history arrow more separation from the rim.
- Website narration sheets pin attribution below the scrolling text, with the actual paging arrows grouped in the header. Wrong-topic actions are red. The report dialog has a black Inter heading, clear text hierarchy, compact actions, a reason menu matching the field width and a softer animated button shadow. Confirmation reads Reported · thank you. Android retains rounded reason choices with improved heading/body hierarchy. Report persistence and retry states remain unchanged internally.
- The desktop navigation uses equally sized icons and stays centered independently of Read's language action, preventing the sideways shift when entering or leaving Read. About uses the rounded information icon.
- About ends with centered bold Hadith Pull, What's new and the social links. The extra sentence, unread green dot and excess bottom gap are removed.

## Verification

- Final full web suite: 102 passed, including all 297 unchanged Android search oracle fixtures. Follow-up manifest/offline/source checks after line-ending normalization: 27 passed. Integration of the remote tick fix passed 53 focused navigation, language, offline and manifest checks.
- Android full suite: 412 passed, two skipped. Focused reference-label, Arabic metadata, pill-motion and report checks: 22 passed. Report service: five passed. The final debug APK was installed on Pixel_9a without clearing app data.
- Visual review checked the desktop filter and report menu, the fixed Recently read sheet, mobile-web card borders/spacing at 390 × 844, and centered footer/header geometry. Reports were opened and cancelled, never submitted.
- Release text assets use canonical LF line endings; the manifest hashes the exact staged bytes used by the published site. Both repositories' docs are updated. Android is committed locally; the website is committed and pushed after integrating the newer remote saved-folder tick fix.

Website release: `20261105-parity-18`.
