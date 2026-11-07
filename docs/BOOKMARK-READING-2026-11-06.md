# Bookmark reading and search follow-up — 6 November 2026

- Bookmarks opens with a single Your folders entry and Backup. The floating Open in Read action appears inside Your folders and inside an individual folder, with book artwork and space above the footer/navigation.
- Desktop folders remain in their original grid positions. Opening one spreads up to three real saved narration previews with a small gap; hover lifts without changing their order. Selecting a preview closes the folder motion before opening the shared narration sheet. The caption contains only the folder name and its options menu; List view is the first menu action.
- Responsive web uses full-width folder rows and a full-page searchable narration list. Selecting a narration opens the same reader sheet. Bookmark sheets have no Wrong topic control; Copy, Share, Move, Also save and Remove remain in the header menu.
- Read can draw from all bookmarks or one folder. References are resolved to canonical URNs, duplicates across folders are removed, and grade fallback stays within the chosen source. An emptied/deleted source never draws unrelated narrations. Long folder labels ellipsize while the full name remains accessible.
- Read From includes Bookmarks and individual folders near the top and in its search. Its search field is more compact. Open in Read from a topic carries that topic along with the exact narration.
- Search and Describe loading now includes both headings, topic previews and narration cards, separated from the query field. Loaded topics fade in. Submitted queries/history/story choices scroll to Narrations after loading and layout, with stale/hidden requests ignored.
- Read's desktop divider spacing is tighter. Recently read aligns with the header logo on desktop and phone. En retains its original placement. Desktop type defaults to 110% at wide widths; browser-controlled zoom is preserved. Footer padding is reduced.

Release: `20261105-parity-19`. The offline manifest is regenerated from canonical LF asset bytes.

Deployment follow-up: Pages artifact names include the run ID and attempt so retries select exactly one artifact. The initial deployment timed out in `updating_pages`; its canceled commit deployment could not be reused, so this workflow correction starts a fresh commit deployment.

Validation: full local suite passed 111 tests. The standalone Pages checkout passed 110 with only the optional sibling-Android comparison skipped (111 total, zero failures). Final focused bookmark/source/search/offline checks passed 22. Visual review verified the unchanged desktop grid slot, preview-to-sheet flow, searchable list selection, exact scoped reading, and phone reflow.

The later phone Categories positioning and navigation fixes are recorded in [RESPONSIVE-CATEGORIES-2026-11-07.md](RESPONSIVE-CATEGORIES-2026-11-07.md).
