# Phone Categories and navigation — 7 November 2026

Release `20261107-parity-20`. See the [9 November follow-up](#android-topic-card-parity-9-november-2026) for the current category detail layout.

- The phone Categories topic action stays 16 px above the bottom tabs, from the first narration through the end of the list. Its sticky offset now uses the page scroller's bottom edge. Previously the tab-bar height and the page's 80 px bottom padding compounded into a 160 px gap on a 390 × 844 viewport. The action still appears only after narrations load; desktop positioning is preserved.
- The sentence “Browse a subject, with every reference attached.” is removed from the phone Categories heading. Desktop retains the introduction.
- Opening a fresh category or topic starts at the top of the actual phone page scroller. Returning with Back/Forward restores that category's own scroll position; desktop window scrolling is retained too. Cached scroll callbacks cannot move a different category after rapid navigation.
- Returning to a cached topic preserves its request identity, so Load more continues adding narrations. Previously the cached list's callbacks were permanently considered stale after returning.
- A category loading while the user changes tabs retains the category route that was requested, rather than reading the new tab's URL and replacing the pending subject with the catalog.
- Stylesheet, navigation, feature scripts, update notice and offline shell/metadata versions advance together. The parity manifest is regenerated from canonical LF runtime assets. Corpus data and Android sources are unchanged.

## Verification

- Full local Node suite: **115 passed**, zero failures or skips, including all 297 unchanged Android search oracle fixtures.
- Pages CI: **114 passed**, zero failures, with the optional sibling-Android byte comparison skipped (115 total).
- Final category/navigation/offline/parity release checks: **46 passed**. All manifest hashes match the final runtime assets.
- Four category navigation regressions cover scroll reset/restoration, cached Load more, stale scroll callbacks and a background category retaining its route. The first two checks reproduced failures against the previously committed code before passing with the fixes.
- Responsive browser checks exercise The Noble Qur'an → Virtues of the Qur'an and Surahs, button geometry at top/middle/end, Back/Forward, Load more after returning, narration paging, exact Open in Read identity, selected-topic reading, language switching, main-tab cycling and Categories reset. Phone layouts are checked for horizontal overflow.
- Chromium checks passed at **320 × 740, 390 × 844, 430 × 932, 720 × 900, 844 × 390 and 1440 × 1000**. The expanded **390 × 844 WebKit** flow also passed. Light and dark phone layouts and the desktop topic layout were visually reviewed; no uncaught page errors or failed site HTTP responses were recorded.
- The 390 × 844 flow also checks saving into a new folder, the Bookmarks landing/Your folders/folder distinction, folder search, a bookmark sheet without Wrong topic, exact folder-scoped Open in Read, Search, Describe, filters, About, Privacy, Licenses, What's new and Contact.
- Local evidence: `.preview/responsive-full-tests.txt`, `.preview/responsive-browser-tests.txt`, `.preview/responsive-webkit-tests.txt`, and `.preview/categories-390-topic.png`. The browser harness is `.preview/responsive-smoke.cjs`; these are local verification files excluded from Git.

Physical phone and in-app Safari toolbar/keyboard behavior still require device testing.

## Deployment follow-up

The first Pages deployment passed CI and uploaded its artifact, then timed out after ten minutes in GitHub's `syncing_files` state. GitHub canceled that commit's deployment. A fresh documentation commit retries deployment with the same tested runtime assets; artifact names retain the existing run-ID/attempt uniqueness. No runtime or workflow workaround was added for the hosting delay.

## Android topic card parity, 9 November 2026

Release `20261109-parity-21` follows the final topic card layout in Android commit `a41f73b`.

- Category details use two equal-width columns with a 10 px gap. A lone card starts in the left column and keeps the same width as a paired card. Tiles have a 112 px minimum height, a 34 px circular motif, a two-line title slot and an aligned narration count. The title and count use the existing Inter face at nominal 14 px and 12 px sizes. The outer catalogue keeps its responsive shelves and featured composition.
- The browser uses the Android display titles, including their short context lines for single-word labels. Longer labels split at a word boundary that fits both lines. The longest line sets a single maximum title size for the category on narrow viewports. The full label remains available to assistive technology and in the topic heading.
- The 44 two-sentence category introductions come directly from Android's arrangement asset. Each sentence has its own line. The original finder descriptions, topic IDs, narration counts and mappings are preserved.
- **Read from this category** uses the same reading-source and draw path as the topic button, with the deduplicated category pool. Both actions float 16 px above the phone tabs, including on short pages. The button remains sticky on long pages, with room to scroll the last row above it.
- The stylesheet, feature-script, offline shell, metadata and update-notice versions advance together. The parity manifest covers 196 runtime assets. The corpus dataset ID remains the same.

### Verification

- All 117 local Node tests passed. This includes checks for the shared Android arrangement bytes, all category descriptions and topic title splits, the category-wide source, and category scroll restoration and Load more.
- Chromium opened all 44 categories at 320 × 740 and checked title fit, equal tile sizes, count alignment, left alignment of unpaired cards, two-line descriptions and the bottom action. Purity, the Five Prayers, Hajj, Zakat and the Qur’an were also checked at 390 × 844 in dark mode and at 720 × 900 and 1440 × 1000 in light mode.
- WebKit repeated the five category checks at 390 × 844 in dark mode. Both engines opened a topic, returned to the category, and drew a narration from the selected category pool. A separate 390 × 844 Chromium smoke test covered Back/Forward, Load more, narration paging, language, tabs, Bookmarks, Search, Describe, filters and secondary pages. Physical-device browser testing remains pending.
