# Phone Categories and navigation — 7 November 2026

Release: `20261107-parity-20`.

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
