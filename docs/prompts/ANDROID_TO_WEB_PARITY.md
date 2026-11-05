# Implement Android feature parity on the Hadith Pull website

You are implementing this task, not merely proposing a plan. Audit the two local projects, then build the missing website features end to end and verify them. Continue through implementation, tests, browser checks and documentation. Do not stop after a feature list, design, scaffold or first working screen.

## Repositories and scope

- **Website — implementation target:** `C:\Users\aarah\Hadith-Pull`
- **Android — reference implementation:** `C:\Users\aarah\Hadith-Pull-Android`
- Treat the Android project as read-only. Port its user-facing capabilities into the website; do not port website features into Android.
- Use both current working trees, not just their last commits. The website already has uncommitted changes. Record `git status` before working and preserve existing work; never reset, clean, overwrite or revert it to obtain a clean tree.
- Read applicable AGENTS.md/CLAUDE.md instructions. In the website read README.md, the current scripts and tests. In Android read the newest entries at the end of `docs/plans/search/PROGRESS.md`, the current section of `docs/plans/categories/DECISIONS.md`, and `docs/plans/categories/VERIFICATION_2026-11-05.md`. Historical plans and Graphify snapshots can be stale: verify against current executable code and assets.
- Make routine implementation decisions yourself and keep working. Ask only for information or external authorization genuinely necessary to proceed. An external blocker must not stop unrelated, implementable features.
- Work locally. Do not commit, push, deploy, run paid labeling/model jobs or modify production services without a subsequent explicit instruction. Pushing website `main` triggers GitHub Pages deployment.

## Objective and initial audit

Bring every implemented Android user-facing capability that is missing or incomplete on the website to functional web parity, using browser-appropriate interactions. Inventory every production tab, route, menu, sheet and action; distinguish implemented behavior from roadmap ideas and debug-only tooling.

Create `docs/ANDROID_WEB_PARITY.md` with a matrix containing: capability, Android source, existing web source, status, implementation approach, and verification. Use statuses such as already present, missing, partial, implemented, browser adaptation, and genuinely Android-only. The requirements below are the minimum scope, not a substitute for that audit.

The website already has random reading, grade filters, English/Arabic reading, themes, folder/bookmark management, Android-compatible library import/export, card rendering and sharing, shared narration links, optional offline downloads, and basic calendar reminders. Preserve and extend these; do not rebuild them merely to claim parity. Check any smaller differences against Android's current code.

The website is plain HTML/CSS/JavaScript with a static GitHub Pages deployment, no application backend or mandatory build step. Keep that architecture unless a specific feature requires a justified dependency. Reuse `script.js`, `navigation.js`, `bookmarks.js`, `card.js`, `offline.js`, `sw.js`, `reminders.js` and the existing design tokens. A browser search worker or locally hosted SQLite/WASM dependency may be justified; a framework migration is not part of this task.

## 1. Synchronize the underlying data correctly

Android's authoritative inputs include:

- `app/src/main/assets/hadith/v2/`
- `app/src/main/assets/topics/{taxonomy.json,labels.json,arrangement.json}`
- `app/src/main/assets/search/v1/{search.db,meta.json}`
- Notification occasion content: `docs/notifications/occasions-approved.json`, copied by Gradle into `app/build/generated/occasionsAssets/notifications/occasions.json`.

Do not confuse the approved notification occasion file with `tools/topics/occasions.json`, which serves a different purpose. Do not substitute an empty debug fallback for the approved content. If an approved input is unavailable, identify it and continue everything that does not depend on it; never invent religious content.

At preparation time, the web and Android narration bundles share dataset ID `7ac043e2ee04f8d7f1f75fcc29b1e5661a945e78dc7cfb1490e430ff7f9b8d96`, but their reading pools differ: web has 31,457 eligible entries and Android 31,139. Refresh these observations before implementation. Equal dataset IDs do not prove equal reading eligibility: pools are excluded from the corpus manifest hashes. Synchronize the latest pool and regenerate web `grades.json` with `node tools/build-grades.mjs`; do not revive the historical v1 data generator or hand-edit eligibility.

Preserve URN identity, collection/reference mappings, legacy links, grades and original texts. Supply reproducible export/copy tools and version/hash checks for new browser assets. Preserve the audited labels and hidden/held-topic decisions exactly. Do not relabel, paraphrase narrations, generate answers or silently alter gradings.

## 2. Categories and topic browsing

Use Android's arrangement as the single source for shelf order, cards, groups, captions, hidden entries and retired-card redirects. Do not independently maintain a second web taxonomy or hard-code a parallel arrangement into several screens.

Implement:

- A Categories tab, searchable cards and topics, grouped card pages, counts and topic narration lists.
- Current order: foundations → Worship → heart/character → personal circumstances → family/community → everyday life → society/law → history → death/Hereafter. Purification precedes Prayer.
- The wide Prophet ﷺ card, single-topic Earlier Prophets direct opening, and existing saved-ID redirects/fallbacks.
- Children and Parenting as a separate four-topic card; Trouble With Relatives belongs in Family. Derive membership from the current JSON, not this prose.
- Narration lists with incremental loading, full narration detail, correct reference/grade/source, previous/next navigation where Android provides it, and working Copy, Save and Share actions for the opened narration.
- “Read from this topic”, which changes Read's source, draws from that source and enters Read without flashing the old narration.

The current Android arrangement has 41 cards, 363 slots and 348 distinct displayed topic IDs, with no empty displayed tiles. Recompute rather than treating these counts as permanent constants.

Port approved `CategoryArt.kt` vectors into a coherent web SVG system. Reuse the same icon mapping in Categories, Search and Read-from. No generated paintings, generic replacement art, Allah lettering or gold line/star/ring card patterns. Keep the accepted choices, including the upright aged parents with staffs and the separate parents-and-child mark on Children and Parenting. Preserve equal head sizes, front-facing posture, the father's kufi/trousers and mother's hijab.

Every regular grid card uses its two actual `gridTitle` lines. Keep the count directly above the title, naturally anchored near the bottom. Do not reserve empty title lines, let short names float over blank placeholders, collapse labels to one line or hide them behind ellipses. Use full names in opened pages, Read-from, results and accessible labels. The featured wide card is the intentional exception. Verify real browser text rendering at compact phone widths; font-width calculations alone cannot prove the layout.

## 3. Read-from, history and draw behavior

Reference `ui/topics/{CategoryMap.kt,ReadFrom.kt,ShortTitles.kt}`, `domain/DrawEngine.kt`, `data/prefs/SettingsRepository.kt`, `ui/reader/{ReaderRoute.kt,RecentReadSheet.kt}` and their tests.

- Add the persistent Read-from picker: All hadith, the same shelves/cards/groups/topics as Categories, current choice first, search, selected styling, correct counts and direct selection of one-topic cards.
- Draw from a card's deduplicated union of topic URNs or one topic's members, retaining the grade filter and Android's defined empty-grade/empty-source fallbacks. Skip the displayed narration when another eligible choice exists. Do not introduce collection-weighted sampling.
- Preserve saved choices across reloads, migrate retired IDs, and fall back safely for unknown IDs. Opening a shared or historical narration must not silently corrupt the saved reading source.
- Use the approved short eyebrow names without marquee scrolling. Language changes must retain narration identity and source.
- Add Recently read: ten previous narrations, newest first, excluding the current one; deduplicate and resolve canonical identities. Record actual successful displays, not prefetches or failed loads. Reopening an entry must work with all existing reader actions.
- Keep reading source and history local. Preserve existing bookmarks, library snapshots, preferences and URL behavior during migration.

## 4. Search and Describe

Reference `data/search/{SearchEngine.kt,SearchRepository.kt}`, `domain/search/`, `ui/search/{SearchScreen.kt,NarrationSheet.kt}`, `tools/search/`, and current Android search tests/evaluation fixtures.

Build a Search tab with both modes:

- **Search:** live debounced English/Arabic word search, remembered phrases, supported references, URNs and current/legacy Hadith Pull links. Reference matches pin the correct narrations. Preserve Arabic/English folding, spelling corrections, curated synonyms, phrase/proximity behavior, enrichment fields and grading treatment.
- **Describe:** natural-language descriptions, suggested topics/situations and ranked narrations; collection, grade and remembered-name filters. Match the current code's live behavior and strict collection/grade filtering. Distinguish complete and closest matches honestly and show corrections/missing conditions where Android does.
- Search suggestions, empty-state Browse from the same arrangement, Describe examples/stories, clear/loading/empty/error states and complete narration detail actions.
- Separate recent Search and Describe lists, five entries each, deduplicated/newest first. Save used queries at Android's actual interaction points, not every keystroke. Support replay, remove and clear.
- Picking a recent query, example or explicit submit scrolls to loaded narration results; ordinary typing does not unexpectedly move the page. Stale async results must never replace a newer query.

The current Android runtime search is local SQLite-backed lexical/enriched retrieval with topic suggestions. Do not infer that a paid LLM, embeddings API or model download is required from older “advanced search” plans. Do not replace it with toy raw-text substring search while claiming equivalent behavior.

Inspect the database schema, tokenizer and encoded index structures before choosing a browser implementation. Use either compatible local SQLite/WASM or a reproducibly derived browser index with equivalent behavior. Verify FTS/tokenizer compatibility, not merely that SQLite loads. Run expensive indexing/search outside the UI thread, load assets lazily, and measure cold/warm latency and downloaded bytes. Keep queries local and do not require API keys or third-party runtime services.

Generate deterministic parity fixtures from the current Android behavior and existing evaluation set. Add a seeded fresh sample of references/real corpus phrases and validate browser results, filters and topic suggestions. Do not change gold data just to make the port pass.

## 5. Wrong-topic reporting

Reference `data/ReportsRepository.kt`, `reports/ReportWorker.kt`, `ui/topics/ReportSheet.kt`, `ui/search/NarrationSheet.kt`, `docs/plans/report-button.md`, and `server/reports/src/index.js`.

- Add the topic-context “Wrong topic?” flow with confirmation, optional structured reason, local deduplication and reported/queued feedback. Report the narration URN and actual taxonomy topic ID, not a gathered card ID or arbitrary search phrase. Never delete a label live because one reader reports it.
- Preserve the server contract: `POST /report` with exactly `install`, `urn`, `topic`, `reason`, `app`; valid UUIDv4 local install ID; accepted reason/version formats. No names, email, free-text narration content, search history or admin secrets.
- Persist an offline queue, expire it after 30 days, retry transient network/408/429/5xx failures with backoff on supported online/reopen events, and stop retrying permanent rejections. Do not promise delivery while a browser is closed.
- Inspect current endpoint configuration and CORS. The server source inspected for this prompt has no OPTIONS/CORS handling, so a direct browser JSON POST is not automatically functional. Prepare the minimal allowlisted-origin CORS patch and tests as a reviewable patch under the website docs if necessary; do not silently modify the Android reference or deploy the Worker. Clearly distinguish frontend completion from an outstanding server deployment. Never use `no-cors` to pretend delivery succeeded.
- Use a mocked endpoint for tests. Do not submit fake reports to production. Update website privacy text to describe the new explicit network operation accurately.

## 6. Browser counterparts for notification, calendar and widget features

Inspect Android `notifications/`—particularly `Slot.kt`, `SlotPlanner.kt`, `HijriCalendar.kt`, `Occasions.kt`, `HadithPicker.kt`—and `widget/HadithWidget.kt`. Audit the actual rules and content, not just the settings labels.

The website already exports basic Morning/Afternoon/Night calendar reminders. Extend the missing browser-portable capabilities: saved slot controls/ranges, Bukhari/Muslim versus all-Sahih content pools, offline Umm al-Qura Hijri display with -1/0/+1 adjustment, approved special-day/Friday content, evening-before reminders for Monday/Thursday/White Days, and relevant calendar exports. Preserve Android's Ramadan/forbidden-fast-day exclusions, local wall-clock behavior, date boundaries and sighting-dependent guidance; never invent fasting dates or religious recommendations.

Provide a purposeful in-page daily-hadith/occasion counterpart for widget content using Android's selection/rotation rules and canonical links. Keep it distinct from the user's manually selected Read source; do not add a redundant navigation tab just to imitate an OS widget.

Do not claim a website can reproduce Android AlarmManager, WorkManager, notification shade actions, exact closed-browser delivery, Glance home-screen widgets, battery-setting deep links or Play updates. Implement useful web counterparts, keep calendar import instructions truthful, and list truly OS-only integrations separately in the matrix. Installing a PWA icon is not the same as a native hadith widget. No background-notification backend or permission prompt unless there is a real, verified delivery implementation.

Port unread developer-note handling/What's new notices if missing, reusing the existing web release-note history. Adapt update handling to service-worker/offline-version updates rather than Play APIs. Do not restore deliberately removed Arabic-script or appearance controls just because legacy preference enums remain in Android.

## 7. Integrate with the existing website

- Add Read, Categories, Search, Bookmarks and About to mobile/desktop navigation consistently. Extend the existing mounted-screen navigation, direct entry URLs, Back/Forward, titles, keyboard help, shortcuts, swipes and state restoration. Do not strand old URLs or rebuild the entire shell.
- Reuse the site's parchment/ink/teal/gold tokens, Cormorant/Inter/Scheherazade fonts, sheets and action components. Make new layouts work on phones and wide desktops. Respect reduced motion, safe areas, focus restoration, screen-reader labels, readable contrast and touch targets. Avoid unintended horizontal scrolling and input-focus zoom.
- Preserve existing sentence-boundary excerpts, selected-text copy behavior, English-only bookmarks, reading-language behavior, references/links, 1080-square export, native share/download fallbacks and Android library format v2 interoperability.
- Queries, history and reading choices remain local. Handle unavailable/full browser storage without breaking basic reading. Render user input/imported data safely.

## 8. Offline support and migrations are part of completion

Include new pages, scripts, icons, topic assets and search assets in the offline flow, with real progress, cancel/retry, quota/error behavior and honest completion status. Do not download a large search database on every initial reader visit. After successful offline saving, Categories, Read-from, history and Search/Describe must work without a connection.

Update `offline.js`, `sw.js`, `navigation.js` and HTML asset versions coherently. Existing SW logic classifies only `/data/v2/` as dataset data and keys caches by pathname; account for new paths and do not assume a query-string version alone fixes stale caching. Reading pools/grades may change without the narration dataset ID changing: invalidate affected metadata correctly while preserving valid saved corpus data. Never erase bookmarks or a previous completed offline copy during a failed/cancelled update.

## 9. Verification and delivery

Implement in complete vertical slices, update the parity matrix/progress after each slice, then continue to the next. Preserve a useful continuation checkpoint if the task spans context windows.

Run existing web tests before and after changes:

```powershell
node --test tests/*.test.mjs
```

Add meaningful tests for data/export hashes, URN resolution, arrangement/membership/redirects, two-line label fit, reader-source/grade fallbacks, history limits, Search/Describe parity and stale-response cancellation, query recents, report queue/status/CORS behavior, calendar/Hijri boundaries, navigation and offline migrations. Preserve library import/export and shared-link tests. Do not bypass failing tests or weaken existing checks.

Serve the website over localhost. Use real browser interaction to verify compact phone, landscape and desktop layouts in both themes, keyboard navigation, reduced motion, back/forward, reload, offline/cancel/update/error paths and preservation of existing saved data. Test the previously troublesome cases: one/two/three-line original category names all display as full two-line grid labels; parents/parenting icons stay distinct; a topic-to-Read transition loads the correct narration without an old-content flash; every new detail action targets the opened narration. Capture screenshots and record browser/performance evidence. State honestly which physical-device/platform checks were unavailable.

Finish by updating README's future/known-limitation sections, privacy copy, release notes and the parity/verification docs. Ensure no active feature is still described as merely planned. Report implemented features, preserved features, tested adaptations, actual test results, screenshots, and any genuinely external/OS-only remainder. Do not mark a server-dependent feature working without evidence or leave functional requirements as decorative buttons. Do not deploy automatically.
