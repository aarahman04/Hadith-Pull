# Arabic and interface polish — 5 November 2026

Final state for this round of the chat; later requests replace earlier design choices.

- Website About: the Android download card is directly below the hero. Idea and Sources have equal-width columns; Typography is paired with Reading and references. Offline reading has useful guidance and sits beside reminders. Dates and occasions is one framed group with custom menu selectors, comfortable arrow spacing and a matching export button. The centered footer has bold Hadith Pull, one sentence, What's new and social links.
- The website header brand returns to Read. The Android header brand opens the system share chooser for the app URL.
- Website tab titles stay Category and Search. The Search subtitle was removed. Expansion controls say Show Arabic and reference or Show Full Hadith and reference, without word counts.
- Search/Describe: the entire pill toggles modes. Web overlaps the old and new content in a 650 ms crossfade and cleans up interrupted transitions. Android uses a two-page HorizontalPager, retains each mode's query and scroll position, and supports both taps and swipes. The selected background uses the existing directional pill treatment.
- The Read-from picker has an explicit entrance animation, a properly established closed layout, and transitions between its category and topic lists. Reduced motion skips movement.
- Reading quotation marks use the same two-part vector on both platforms, avoiding font substitutions. The web restarts the quotation entrance with each narration; Android renders both shapes in one vector within the narration transition.
- Android Read-from has the website's book/topic artwork and accent color, a stronger history clock, and no pressed background on the heading.
- Faith has a raised-index mark, night/special prayers use the former Faith crescent and star, and Fasting has dates and water at sunset. Android vectors are exported directly to the website.

## Arabic source metadata

Both platforms load optional per-collection reference sidecars keyed by the existing English URN. They contain Arabic chapter titles and explicitly tagged companion names from the exact source SQL snapshot used by the shipped corpus. The source SHA-256 is `750af540993ea85b6a25742192bc73a938e5b247ee3ffaabe464e9fe987c204d`.

The export verifies 33,440 record identities and unchanged English chapter titles. It supplies 32,703 Arabic chapter titles and 11,418 narrator labels. When an Arabic label is absent in that source, it is omitted rather than translated from the English. Original narration text, URNs, grades and topic membership are unchanged.

Collection/reference/in-book/chapter/narrator/grade/source-link displays follow Arabic mode in Read and narration sheets. Reading controls and Copy/Share labels follow that language too. English exports remain unchanged. Web metadata requests recover after a temporary failure even when the corpus shard is already cached. Sidecars are included in the offline manifest; Android bundles the identical files.

Regenerate with `node tools/build-arabic-metadata.mjs SOURCE.sql`, using the matching source dump, then regenerate the parity manifest. The local archive is not a runtime dependency.

## Validation and limits

- Full website test suite, including all 297 unchanged Android search fixtures; focused transition, picker, dropdown persistence, Arabic source identity, metadata recovery and tab-title regressions.
- Android full unit suite before the later pager/header refinements: 411 passed, two skipped. Final focused Arabic, source-store and category tests passed; the debug APK built and was installed on Pixel_9a without clearing app data.
- Earlier desktop/mobile visual checks covered the Arabic Read and narration sheet, smaller Open in Read, balanced About sections, filters, and native web sharing before the website brand was changed back to home.
- Computer Use was stopped with Escape. The final pager/header, occasion selector and footer refinements were checked in code and builds, but were not visually inspected after that stop.
- Independent website review identified and fixed Arabic result references, footer visibility on preloaded routes, and metadata retry/recovery behavior. Nothing was deployed.

Release: `20261105-parity-15`.
