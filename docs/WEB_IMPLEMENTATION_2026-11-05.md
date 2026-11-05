# Website implementation and decisions — 2026-11-05

This is the consolidated record of the Android-to-web implementation and the owner's subsequent design revisions. The final local website release is `20261105-parity-9`. No commit, push, production deployment, paid enrichment job or production report submission was performed.

Related records:

- [Capability matrix and route inventory](ANDROID_WEB_PARITY.md)
- [Actual verification, commands, results and screenshots](verification/ANDROID_WEB_2026-11-05.md)
- [Web design direction and researched references](WEB_CATALOGUE_DESIGN.md)
- [Report-server deployment dependency](report-server/README.md)
- [Original implementation requirements](prompts/ANDROID_TO_WEB_PARITY.md)

## Scope and preservation

The website remains plain HTML, CSS and JavaScript on its existing static-hosting architecture. Existing random reading, grade preferences, English/Arabic reading, themes, folder management, library format v2 import/export, shared links, copy, card generation and image export were extended rather than replaced.

Both repositories contained existing work. Initial status snapshots are in `verification/web-status-before.txt` and `verification/android-status-before.txt`; final snapshots are beside them. No reset, clean, bookmark migration that erases data, or rollback of another task's changes was used.

Android supplied the executable reference and approved content/artwork. The owner later explicitly requested Search/Describe fading in Android too. This task authored that narrow native transition change only; it did not redesign Android cards or their arrangement. Other Android changes arrived concurrently, including the approved Prayer split and shorter titles. Those inputs were refreshed into the website; their native implementation is not claimed as this task's work.

## Shared content and reproducible exports

| Change | Decision and reason |
|---|---|
| Reading eligibility | Synchronized the current Android pool and regenerated web grades using the existing builder. Equal dataset IDs do not guarantee equal pool eligibility. The initial web pool had 31,457 eligible records; the synchronized pool has 31,139. |
| Corpus identity | Retained dataset ID `7ac043e2ee04f8d7f1f75fcc29b1e5661a945e78dc7cfb1490e430ff7f9b8d96`, URNs, original texts, references, collection mappings, legacy links and reported grades. No relabeling or generated religious content. |
| Categories | Arrangement, taxonomy and audited labels remain authoritative. Final current counts: 43 cards, 363 displayed slots, 348 unique displayed topics, no empty displayed tiles. Parenting has four topics; relatives remain under Family. Hidden decisions and remaining retired-ID redirects are preserved. |
| Artwork | Exported 59 SVG marks and the Kotlin icon mapping, including the distinct approved parent and parenting vectors. No generic replacement pictures, Allah lettering or decorative gold patterns. Material TwoTone paths retain their license. |
| Short titles/finder | Exported 234 short titles and the current finder vocabulary from Kotlin. Full titles remain available in opened pages, searches and accessible names. Regular category grids use their actual two `gridTitle` lines. |
| Search | Copied the shipped 27,926,528-byte FTS4 database and metadata. Queries run locally against that index. |
| Occasions | Used `docs/notifications/occasions-approved.json`, not the unrelated topic-labeling occasions file or an empty debug asset. |
| Daily content | Exported the exact 734 saying texts, Kotlin-seeded rotation and native clean/short eligibility flags. Selection is independent of the manually chosen Read source. |
| Hijri dates | Exported offline JVM Umm al-Qura boundaries for 1300–1600 AH, including the terminal boundary, rather than substituting approximate arithmetic dates. |
| Integrity | `data/parity-manifest.json` hashes 186 runtime data/code/license assets. Mutable metadata is versioned independently of immutable narration shards. |

Reproduction tools: `tools/sync-android.py`, `tools/export-category-art.py`, `tools/generate-parity-fixtures.py`, `tools/oracle/`, the existing `tools/build-grades.mjs`, and `tools/build-parity-manifest.mjs`. The README gives the complete regeneration order. Export-time Python/JVM tooling is not a browser runtime requirement.

## Categories and web layout

Added a Categories route and tab, root shelves, topic finder, subject banners, grouped topic pages, direct opening for single-topic cards, counts, incremental narration lists and full detail actions. The arrangement drives Categories, Search Browse and Read-from; there is no separately maintained web taxonomy.

The owner explicitly separated content parity from visual parity. Web arrangement was researched using Carbon, Skyscanner Backpack and the Scottish Government design system; sources and their specific influence are recorded in the design notes. The website uses its own wide-screen composition.

Final decisions:

- Keep the page title and topic finder centered to match the house page treatment.
- Remove the introduced left-hand library index. Keep shelf labels small, left-aligned and visually quiet. Remove the large centered shelf headings and redundant visible shelf counts.
- Keep the expressive opening: the large Prophet ﷺ card beside Faith and the Qur'an.
- Balance the remaining rows instead of leaving a final isolated subject. Four-card shelves occupy one desktop row; ten cards use 4/3/3. At medium widths these become 2/2 and 3/3/2/2. Updated Worship uses 4/4 on desktop. History and Hereafter each fill a two-card row.
- Compute spans from actual membership counts, without hard-coding card IDs or changing shared order. The row-balancing function has regression tests.
- Retain parchment/ink/teal/gold tokens, Cormorant headings, Inter controls and approved compact teal artwork. Use quiet surfaces and restrained hover/focus feedback.
- On compact phones, keep two-column category cards, measured two-line labels and full-width topic rows where necessary. Corrected double side padding, the longest label's fit, and opened-subject banner layout at 320px.
- Cache recent category views and their scroll position, restore Back/Forward, reset explicitly on All categories, and focus the opened subject heading.

## Read-from and history

Added a persistent Read-from picker with All hadith, shelves/cards/groups/topics, search, the current choice first, approved short labels and matching artwork. A card draws from the deduplicated union of its current displayed topics. Grade preferences continue to apply; the specified source fallback prevents an empty grade intersection from making the reader unusable. The current narration is excluded when alternatives exist.

Read from this topic completes the new draw while Read is hidden, then changes screens. This prevents arrival from briefly displaying the previous narration. Shared narration links retain the selected source.

Recently read stores ten previous canonical displayed narrations, excludes the current one, and does not consume hidden preloads, superseded shared identities or failed/in-flight displays. The history button waits for an in-flight draw. Storage errors do not stop basic reading.

## Search and Describe

Added the Search route, local worker, lexical/enriched search engine, Search/Describe modes, Arabic normalization, English stemming, curated synonyms, spelling corrections, exact remembered lines, reference/URN/current-and-legacy-link resolution, pins, ranked topic suggestions, strict collection/grade/name filters, missing-condition feedback and story examples.

SQL.js 1.13.0 is the justified local WASM dependency: the native search requires the shipped SQLite FTS4 tokenizer, `NEAR`, `matchinfo` and BM25F behavior. A hand-written substring search would not preserve ranking. No framework migration, API key, remote query endpoint or generated answer was introduced. Large search assets load lazily when search is used, not on every reader visit.

The worker serializes initialization and skips superseded cold requests; page serial checks prevent stale results or narration batches from appearing under a newer query. Search/Describe keep independent in-session drafts and separate local recent lists. Recents are saved at actual use/submit, not on every keystroke.

Final visual/interaction decisions:

- Use a quiet Search/Describe control within the Search page, not another primary navigation tab.
- Fade the mode content in both directions over 260ms; skip animation for reduced motion. Android uses a matching mode-keyed alpha entrance without duplicating list state or altering cards.
- Remove the input Clear button and replace the large round Find button with an integrated magnifier and an accessible Find label.
- Replace pill-shaped recent-query/remove controls and row dividers with plain text rows, quiet remove icons and one small history Clear action. Show recents when the query is blank.
- Keep filters behind More filters. Keep first-use local-index information truthful.
- Prevent native form submission before initialization; enable Find when its handler is ready and honor text already entered during loading.
- Show nine Browse cards: the featured card plus an even number of regular cards, avoiding a lone last tile.

## Narration details and result cards

Categories and Search share one full-detail implementation. Every Copy, Save, Share, source link and Open in Read action uses the opened record, not the independent narration currently selected in Read.

The owner's final sizing request is implemented as follows:

- Result-summary cards have a consistent height. Summaries are excerpts; opening the card exposes the complete original text.
- Full details use an 880px maximum width and a fixed 780px desktop frame, constrained by viewport height. Phones use viewport height minus 24px. Text length, paging and language changes do not resize the frame.
- A compact pager and the shared Read En/ع control sit at the top, with an X close icon and thin progress track. Previous/next have appropriate disabled states.
- Collection/reference/grade and in-book numbers stay above the independently scrolling narration region. The region is focusable and labeled for assistive technology.
- Chapter, complete narration, narrator attribution and original grading lines remain available. Attribution and grading are grouped below the text, followed by quiet Open in Read/Sunnah.com links and the context-specific Wrong topic action.
- Copy/Save/Share stay in a fixed bottom action row. Source and pager actions no longer use large pill buttons.
- Phone sheets enter from below. The initial layout is established before opening so the CSS transition actually runs; selectors override the existing generic modal transform correctly.
- Arrow keys and horizontal swipes page results. Modified keys, selected text, form controls and a nested topmost sheet do not accidentally page the underlying narration. Vertical scrolling and downward dismissal coexist.
- Cancel stale detail loads and clear stale actions while paging. Nested Save/Share dialogs appear above the detail and restore focus correctly.
- Reuse Read's language control markup and state-based styling, with detail-local state. Fade the text on language change without changing frame size. The four records without Arabic keep their English text visible and disable the unavailable choice; no blank Arabic screen is shown.

Folder Save supports existing folders and creation through the existing store. Share retains the established renderer, 1080-square export, native-share/download fallbacks and canonical links. English-only bookmark behavior and library format v2 remain unchanged.

## Wrong-topic reports

Added explicit topic-context reporting, confirmation, an optional reason, UUIDv4 installation identity, the exact minimal payload and a persistent deduplicated queue. Reports expire after 30 days, transient network/408/429/5xx failures use backoff, permanent rejections stop, and concurrent enqueues survive an active flush. Retry triggers are browser-open/reopen, visibility, online and a periodic check while open.

Only actual taxonomy membership is reportable. No narration body, history, query, admin secret or invented acknowledgment is sent. Failed local persistence is not described as a successful queue.

The production endpoint does not yet provide verified browser CORS. The website therefore keeps the endpoint disabled and truthfully says queued. A minimal allowlisted-origin wrapper, exact patch, mock tests and deployment instructions are under `docs/report-server/`. Native no-Origin requests retain their behavior; admin counts do not acquire CORS. No `no-cors` workaround or fake success is used. Server deployment and production activation require a separate instruction.

## Daily content, occasions and calendar

Added an in-page About daily saying/occasion counterpart rather than an unnecessary widget tab. It follows the exported saying cycle and Friday weekly index, opens canonical full detail, and does not change Read's selected source/cursor.

Extended existing calendar reminders with saved slot ranges/settings, Bukhari/Muslim versus all-Sahih pools, approved special-day/Friday content, recurring evening-before Monday/Thursday/White Day reminders, offline Hijri display and −1/0/+1 adjustment. Preserved Ramadan/forbidden-fast-day exclusions, native priority/slot rules, readable-text selection attempts, repeat exclusions and local wall-clock semantics.

One-year ICS export contains selected narration content, canonical links and alarms. Slot validation uses the currently visible form values and rejects invalid ranges; UTF-8 lines are folded correctly. Instructions explain calendar import/replacement and local sighting uncertainty.

Browser adaptations are explicit: calendar applications control alert delivery; the website cannot reproduce AlarmManager, WorkManager, notification-shade actions, exact closed-browser alarms, Glance widgets, battery-setting links or Play updates. No unsupported push permission request/backend was added.

## Integration, offline and storage

All page shells now expose Read, Categories, Search, Bookmarks and About consistently. The existing mounted-screen navigation handles new routes, titles, direct entry, restoration, focus, keyboard cycling and swipes. Optional new-feature script failures do not prevent the basic reader from opening.

Added unread release handling through What's new and a quiet About/navigation indication, reusing release history. README future-feature claims, release notes, privacy and dependency licenses were updated to match actual behavior.

Offline saving includes new pages/scripts, SVG data, categories, search/WASM, dates and daily content. Progress, cancellation, retry and completion are real. Each versioned asset is hash-checked; completion is written only after the full save succeeds. Cancellation also works while worker activation is pending.

Immutable corpus shards remain in the dataset cache. Pools, grades, taxonomy, search and other mutable metadata use release-specific caches; HTML/JS/CSS use the matching shell release. All `/data/` routes are classified correctly. Failed/cancelled upgrades retain the previous complete copy, including legacy metadata fallback; bookmarks are never cleared. An incomplete new shell is not mixed into an older completed offline shell.

Local preference/history/report access handles malformed, full or unavailable storage safely. User-provided values use text nodes. Only audited local SVG paths and fixed control markup are inserted as markup. No new telemetry or remote search operation was added.

## Files changed

| Files | Responsibility |
|---|---|
| `categories.html`, `search.html` | New routes and accessible page controls. |
| Existing root HTML pages | Five-tab navigation and coherent CSS/navigation versions; About, release notes, privacy and licenses also receive feature-specific content. |
| `style.css` | Catalogue, responsive fit, search/recents, fixed narration frame, shared language-control states, sheets, focus and reduced-motion presentation. |
| `parity-core.js`, `topics.js` | Shared arrangement/finder/storage models, balanced rows, categories, sources/history interfaces, narration details/actions/reports. |
| `search-engine.js`, `search-worker.js`, `search.js` | Local search parity, worker lifecycle and page interaction. |
| `script.js`, `bookmarks.js` | Existing reader/store integration, safe preferences, source drawing/history and modal gesture/focus fixes; preserved existing reader and library actions. |
| `reports.js` | Minimal report payload, persistent queue and truthful delivery states. |
| `occasions.js`, `daily.js`, `reminders.js` | Native-equivalent date/content rules, daily in-page content and calendar/settings integration. |
| `updates.js`, `navigation.js`, `offline.js`, `sw.js` | Release state, five-screen shell, verified downloads and version/migration handling. |
| `data/v2/pools.txt`, `data/v2/grades.json` | Current discovery eligibility and regenerated grade index. |
| `data/topics/`, `data/search/`, `data/notifications/`, `data/daily-sayings.json`, `data/reading-pools.json`, `data/parity-manifest.json` | Authoritative copied inputs, reproducible derived browser data and hashes. |
| `vendor/sqljs/`, `vendor/material-icons/LICENSE` | Local search runtime and dependency notices. |
| `tools/sync-android.py`, `tools/export-category-art.py`, `tools/generate-parity-fixtures.py`, `tools/oracle/`, `tools/build-parity-manifest.mjs` | Reproducible assets/oracles/integrity tooling. |
| `tools/serve.py` | Loopback-only static preview with clean routes. |
| `tests/parity.test.mjs`, `tests/search-parity.test.mjs`, `tests/worker-lifecycle.test.mjs`, `tests/fixtures/` | Content integrity, models, queue/CORS/calendar and native-search equivalence checks. |
| Existing navigation/offline/reader-animation/reading-language tests | Extended contracts and regressions without weakening previous checks. |
| `README.md`, `docs/`, `.gitignore` | User/developer documentation, reviewed CORS patch, actual verification/evidence, and ignored local design/compiler scratch output. |

## Verification and limits

- Baseline web suite: 43/43. Final full suite: **68/68**, including **297 complete native-search oracle cases**. Final focused asset/offline/language checks: **29/29**. Actual outputs are retained under `docs/verification/`.
- Android Kotlin compilation and the isolated focused native test run pass: six SearchText tests and two NarrationTransition tests. A full native suite was attempted but hit Windows Robolectric ashmem/test-executor failure; a shared-results retry encountered another build's locked output. These attempts are documented as unsuccessful, not passed.
- Real browser checks cover compact phone, landscape and desktop, both themes, label fit, balanced rows, detail identity and sizing, source/history/restoration, saving/sharing/export, reporting feedback, calendar downloads, cold/warm search and offline/cancel/update behavior.
- Actual final offline saving and update completed. With the loopback server stopped and HTTP failure confirmed, fresh Categories and Search/Describe loaded from caches, including full narration bodies. Final release's no-Arabic fallback was also checked offline.
- The exported PNG is 1080×1080. A real yearly calendar contained 732 events/alarms under the tested settings. Browser timing measurements and screenshots are recorded in the verification document.
- Physical iOS/Android browsers, hardware touch behavior, native fade timing, external share destinations and calendar-app alert delivery were not available for verification. Browser reduced-motion emulation was unavailable; relevant branches have automated coverage.
- Production report delivery awaits the separate CORS deployment and verified endpoint activation. No production feature is claimed delivered through an unconfigured server.

The machine briefly ran out of disk space during concurrent verification. The stylesheet was recovered from its complete local snapshot, current edits were reapplied, and checks were repeated. No user data was deleted; only this task's duplicate exported image was briefly removed and then restored from the downloaded original.
