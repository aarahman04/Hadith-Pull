# Independent website review — 5 November 2026

Requested after the Read-from picker refinement. A separate agent reviewed website source and the local website at desktop and 390 × 844 sizes. Android was excluded from its review. No reviewer source edits were made.

## Applied findings

1. **An explicit narration could lose to an earlier random draw.** `openShared` now supersedes earlier draw/shared requests. Request tokens prevent stale results, errors and URLs from replacing the latest selection. Deferred-draw and reversed-completion regression tests pass.
2. **Rapid mobile tab reversals could hide the active screen.** Navigation cancels and cleans up previous slides before switching. Completion callbacks check their transition token. A Read → Categories → Read regression test passes.
3. **Read-from reused About's collection-chip class.** The picker now uses `source-picker-list`, keeping its groups and current source in a full-width vertical layout.
4. **Arabic searches rendered English results.** The search query's language now reaches result excerpts and narration details. Arabic excerpts have Arabic typography and explicit language/direction; absent Arabic falls back to English. Retrieval and ranking were preserved.
5. **Removed sheets remained held in memory.** Return-focus targets now use a `WeakMap`.
6. **A failed preload could leave a later keyboard-opened page uninitialized.** Required page roots must load before one-time feature initialization. A failed preload shows a retry action without destroying the existing page markup. The retry test confirms Search initializes after recovery.

The reviewer re-read the fixes and independently ran 23 relevant tests: all passed, with no further actionable findings.

## Read-from refinements

- All Hadith uses visible book artwork, including in the Read heading and when returning from a selected subject.
- Selected icons retain their artwork in a rounded square instead of an empty accent circle.
- Search has one outer pill, a magnifier, a clear control and a no-results message.
- Categories and topics are grouped in two columns on desktop and one on phones. An odd final option fills the remaining row.
- A quiet SVG back control matches Categories. Escape returns from a subject to the picker root before closing the picker.
- Choosing a category from search clears the old filter and cancels pending result fades.
- Injustice and Turmoil uses scales inside a shield. The shared vector source and browser export match.
- Relatives and its topic membership were left unchanged, following the user's cancellation of an extra card.

Validation includes the full web suite, focused Android icon tests, visual picker checks, and the independent review. Production hosting, real-device mobile behavior, a complete offline download and destructive bookmark actions were outside this review. No deployment or emulator APK installation was performed.
