# Website refinements — 5 November 2026

Implemented from the Gather note and the follow-up requests in this chat.

- Read, Categories, Search, Bookmarks and About use the shared outer width. Desktop narration and saved-card lists use columns; narrow screens retain one readable column.
- Categories and Search share pill-shaped search fields, SVG search/clear controls and a single outer border. Removed the idle topic total. Topic browsing matches prefixes from the first letter; results fade out and rise in.
- Category and topic hover changes ease over 450 ms. Narration results have fixed-height four-line excerpts, a reference row and a separate grade pill. Card-shaped skeletons retain the layout while loading.
- Narration details use a framed card, reference/book/chapter information, a green Sunnah.com link and narrator attribution without a repeated grade block. The fixed footer contains Open in Read; Wrong topic is centered above it. Copy, Save and Share remain available in Read.
- Narration paging moves the entire card, with the outgoing card receding and the incoming card settling into place. On-screen arrows, keyboard Left/Right and horizontal touch swipes page through results. The keyboard handler belongs only to the topmost narration sheet and is removed on close. Reduced motion skips animations.
- Recently read uses the Android history SVG and compact rows with two-line excerpts. Hovering does not lift rows into the scroll boundary.
- Search/Describe uses a sliding segmented pill. Describe has one quiet Filters control containing collection, grade and remembered-name fields, with a selected-filter count.
- About places Typography below The Idea, and centers the credits, What's new and social links across the full width. The header About tab has no unread dot.
- Selecting the already-active Categories tab resets its route, query, cached views and scroll. Escape closes narration sheets; on category pages it steps from topic to parent category to the full catalog. The root search can also be cleared with Escape.
- Read from this topic is centered and appears only after the first narrations load. Its label reflects whether that topic is already selected.
- Children and Parenting remains separate from Honouring Parents. Family and Household contains household/childcare topics. Relatives and Kinship contains Ties of Kinship and Trouble With Relatives. Family and Community lays out as three cards above two on desktop. Injustice and Turmoil uses scales.
- The category arrangement, named icon mappings and short titles are synchronized with Android source. Taxonomy, narration labels, texts and grades were preserved.
- Release `20261105-parity-12` refreshes the shell and metadata caches. Worker registration includes the release and bypasses the HTTP script cache.

The later Read-from picker refinement and six applied independent-review findings are recorded in [WEBSITE-AUDIT-2026-11-05.md](WEBSITE-AUDIT-2026-11-05.md).

Validation: web unit/integration checks, all 297 Android search fixtures, focused Android Moments/ReadFromFallback/ShortTitles tests, desktop/mobile visual checks, keyboard paging, exact Open in Read identity, Escape, category reset and measured floating-button centering. The emulator APK was not reinstalled and nothing was deployed.


The later Arabic and interface refinements, including emulator installation, are recorded in [ARABIC-AND-UI-POLISH-2026-11-05.md](ARABIC-AND-UI-POLISH-2026-11-05.md).
