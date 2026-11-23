# Graph Report - Hadith-Pull (2026-11-23)

## Verified coverage

- Every current web project file has a graph entry. This refresh mapped 618 previously absent files, bringing coverage to 969 files.
- Graphify extracted structural nodes from 52 inputs. A JavaScript syntax pass recovered 329 additional named declarations. The refresh added semantic details for 88 documents and images. 793 files are indexed by path and folder.
- Scope covers tracked and non-ignored project files. Local agent settings and generated Graphify files are outside the scan.
- See [coverage](coverage.json) for exact paths and [diagnostics](DIAGNOSTICS.md) for extraction limits.
- The follow-up added 6 browser event and handler nodes and 31 source-verified links. The links cover tab events, reader actions, worker dispatch, card rendering, and offline registration.
- Source locations reflect the phone reading-width release at 345ac57. The graph links its parity notes to the CSS frame and place text box.
- The browser graph shows every node. Click a symbol to see its source path, line, and neighbors.

## Corpus Check
- Large corpus: 954 files · ~13,283,760 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 2349 nodes · 4550 edges · 112 communities (72 shown, 40 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 81 edges (avg confidence: 0.86)
- Token usage for local semantic extraction was unavailable.

## Community Hubs (Navigation)
- chains
- Dataset Manifest Entries
- people
- sql wasm
- places
- Reader State and Elements
- Bookmark Library Interface
- material icons
- topics
- search engine
- License Page and Manifest
- titles
- parity core
- narrators
- search parity.test
- card
- bukhari
- abudawud
- muslim
- bukhari
- muslim
- nasai
- nasai
- Dataset Build Pipeline
- abudawud
- Font License Terms
- Narration Selection and Display
- Privacy and Local Storage
- card art
- Contact and App Redirect
- ibnmajah
- ibnmajah
- parity.test
- data
- tirmidhi
- Google Play Policy Reference
- Behavior Tests and Reminders
- tirmidhi
- Sunnah API Reference
- Reading Pools and Architecture
- navigation
- Narration Text and Grades
- Share Card Generation
- search
- About and Source Traceability
- Reader Language and Expansion
- Historical Build Report
- ANDROID WEB PARITY
- docs
- ANDROID WEB 2026 11 05
- verification
- index
- occasions
- Theme and Grade Controls
- Behavior Tests and Reminders
- Dataset Loading and Lookup
- Main Reader Page
- occasion controls.test
- Behavior Tests and Reminders
- BOOKMARK READING 2026 11 06
- ANDROID TO WEB PARITY
- Final 320px category layout
- Bookmark Page and Sharing
- Logo Design Assets
- Navigation Sheets and Dialogs
- Cursor
- daily
- malik
- Dataset Build Pipeline
- Behavior Tests and Reminders
- Behavior Tests and Reminders
- Main
- ANDROID PARITY 2026 11 22
- WEB IMPLEMENTATION 2026 11 05
- GitHub Pages Deployment
- Android to web browser verification evidence
- SVG Favicon Design
- Social Preview Design
- reports
- build narrators
- sync android
- Desktop Children and Parenting detail
- export category art
- Behavior Tests and Reminders
- reading source.test
- Repository Working Guidelines
- Reading Pools and Architecture
- ANDROID PARITY 2026 11 21
- PLACE LOOKS 2026 11 17
- browse motion.test
- DomainStubs
- serve
- Share card Desert day background
- Share card Desert night background
- Share card Forest path day background
- Share card Forest path night background
- Share card Kaaba day background
- Share card Kaaba night background
- Share card Misty hills day background
- Share card Mosque night background
- Share card Green valley day background
- Share card Green valley night background
- Share card River valley day background
- Share card River valley night background
- Share card Sea day background
- Share card Sea night background
- Early dark desktop category catalogue
- Early dark mobile category catalogue
- Exported 1080px Bukhari 1 share card
- Mobile available offline status
- Final desktop Search landing
- WEB CATALOGUE DESIGN

## God Nodes (most connected - your core abstractions)
1. `files` - 142 edges
2. `Hadith-Pull` - 50 edges
3. `c()` - 30 edges
4. `el()` - 26 edges
5. `SearchEngine` - 24 edges
6. `e()` - 20 edges
7. `render()` - 20 edges
8. `fill()` - 20 edges
9. `H()` - 19 edges
10. `initReader()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `SIL Open Font License 1.1` --semantically_similar_to--> `SIL Open Font License 1.1`  [INFERRED] [semantically similar]
  licenses/ofl_amiri.txt → licenses.html
- `SIL Open Font License 1.1` --semantically_similar_to--> `SIL Open Font License 1.1`  [INFERRED] [semantically similar]
  licenses/ofl_cormorant_garamond.txt → licenses.html
- `SIL Open Font License 1.1` --semantically_similar_to--> `SIL Open Font License 1.1`  [INFERRED] [semantically similar]
  licenses/ofl_inter.txt → licenses.html
- `SIL Open Font License 1.1` --semantically_similar_to--> `SIL Open Font License 1.1`  [INFERRED] [semantically similar]
  licenses/ofl_noto_naskh_arabic.txt → licenses.html
- `SIL Open Font License 1.1` --semantically_similar_to--> `SIL Open Font License 1.1`  [INFERRED] [semantically similar]
  licenses/ofl_scheherazade_new.txt → licenses.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **On-device reading and storage** — readme_same_origin_v2_bundle, readme_offline_reading, readme_local_bookmark_library [INFERRED 0.85]
- **Reference-preserving reading and sharing** — readme_urn_identity, readme_audited_legacy_key_map, readme_reference_preserving_share_cards [INFERRED 0.85]

## Communities (112 total, 40 thin omitted)

### Community 1 - "Dataset Manifest Entries"
Cohesion: 0.03
Nodes (144): androidOnly, datasetId, files, abudawud/0.json, abudawud/10.json, abudawud/11.json, abudawud/12.json, abudawud/13.json (+136 more)

### Community 3 - "sql wasm"
Cohesion: 0.05
Nodes (63): vendor/, vendor/sqljs/, a(), ac(), b(), Bb(), bc(), c() (+55 more)

### Community 4 - "places"
Cohesion: 0.06
Nodes (93): arriving(), aside(), buildCover(), camel(), cave(), caveShape(), change(), city() (+85 more)

### Community 5 - "Reader State and Elements"
Cohesion: 0.03
Nodes (68): squash(), update(), appearancePainters, ARABIC_COLLECTIONS, ARABIC_GRADES, arabicBlock, arabicDiv, arabicMetadata (+60 more)

### Community 6 - "Bookmark Library Interface"
Cohesion: 0.09
Nodes (54): BookmarkStore, currentFolderId(), deleteFolder(), el(), folderListContents(), paint(), folderMenu(), folderNameProblem() (+46 more)

### Community 8 - "topics"
Cohesion: 0.17
Nodes (43): append(), appendCategoryTopics(), apply(), bookmarkIcon(), button(), card(), categoryDescription(), cleanup() (+35 more)

### Community 9 - "search engine"
Cohesion: 0.12
Nodes (9): first(), foldArabic(), foldEnglish(), isArabic(), words(), editDistance(), parseReference(), plainSpeech() (+1 more)

### Community 10 - "License Page and Manifest"
Cohesion: 0.11
Nodes (23): Categories browser route, https://sunnah.com/, Prefilled email contact, 96 pixel favicon, Gold curved upward arrow, Dark green calligraphic brand mark, Transparent icon background, 192 pixel web app manifest icon (+15 more)

### Community 11 - "titles"
Cohesion: 0.06
Nodes (3): data/narrators/, data/narrators/v1/, data/narrators/v1/titles/

### Community 12 - "parity core"
Cohesion: 0.10
Nodes (21): any(), fold(), unique(), words(), Categories, get(), historyAfterDisplay(), nextInRound() (+13 more)

### Community 13 - "narrators"
Cohesion: 0.18
Nodes (33): action(), arabic(), bare(), body(), chainPage(), chip(), el(), ensure() (+25 more)

### Community 14 - "search parity.test"
Cohesion: 0.07
Nodes (11): data/search/, data/search/v1/, data/topics/, tests/fixtures/, tail, engine, json(), read() (+3 more)

### Community 15 - "card"
Cohesion: 0.13
Nodes (30): HadithCard, argb(), artPath(), artworkById(), at(), classicPlace(), drawArtworkBackground(), drawBlock() (+22 more)

### Community 17 - "abudawud"
Cohesion: 0.06
Nodes (5): data/v2/, data/v2/abudawud/, data/v2/nawawi40/, data/v2/qudsi40/, data/v2/shahwaliullah40/

### Community 23 - "Dataset Build Pipeline"
Cohesion: 0.17
Nodes (22): buildCollection(), CACHE_DIR, collapseWhitespace(), COLLECTIONS, computePrimary(), computeRef(), CROSS_REF_PATTERNS, __dirname (+14 more)

### Community 25 - "Font License Terms"
Cohesion: 0.15
Nodes (17): licenses/, Amiri, licenses\ofl_amiri.txt, SIL Open Font License 1.1, Cormorant Garamond, licenses\ofl_cormorant_garamond.txt, SIL Open Font License 1.1, licenses\ofl_inter.txt (+9 more)

### Community 26 - "Narration Selection and Display"
Cohesion: 0.18
Nodes (22): $(), animateNarrationIn(), copyText(), displayHadith(), draw(), initGradeFilter(), initReadingLanguage(), lockPill() (+14 more)

### Community 27 - "Privacy and Local Storage"
Cohesion: 0.29
Nodes (14): favicons\apple-touch-icon.png, favicons\favicon-96x96.png, favicons\favicon.ico, favicons\favicon.svg, favicons\site.webmanifest, favicons\web-app-manifest-192x192.png, Android no Internet permission, Device-only preferences and library (+6 more)

### Community 28 - "card art"
Cohesion: 0.11
Nodes (11): Share card Clouds day background, Share card Clouds day thumbnail, Share card Clouds night background, Share card Clouds night thumbnail, Share card Google Play mark, Share card Hadith Pull brand mark, Share card Misty hills night background, Share card Misty hills night thumbnail (+3 more)

### Community 29 - "Contact and App Redirect"
Cohesion: 0.12
Nodes (11): Android promotional redirect, app\index.html, https://play.google.com/store/apps/details, h\index.html, Shared hadith router, Hadith-Pull, app/, h/ (+3 more)

### Community 32 - "parity.test"
Cohesion: 0.13
Nodes (9): REPORT_ORIGINS, withReportCors(), json(), model, O, P, read(), { Reports } (+1 more)

### Community 33 - "data"
Cohesion: 0.13
Nodes (5): data/, data/arabic-metadata/, digest(), files, walk()

### Community 35 - "Google Play Policy Reference"
Cohesion: 0.20
Nodes (16): Playstore/, Developer verification, Playstore\Policy Coverage.md, Enforcement and appeals, Google Play Developer Program Policies, Official account transfer, Play Protect, Account deletion requirement (+8 more)

### Community 36 - "Behavior Tests and Reminders"
Cohesion: 0.12
Nodes (3): tests/, folderView(), node()

### Community 38 - "Sunnah API Reference"
Cohesion: 0.21
Nodes (15): Sunnah API/, Black and flake8, Docker Compose MySQL environment, Sunnah API\README (6).md, Flask development server, Official Sunnah.com API, uWSGI production daemon, Batch collection reference lookup (+7 more)

### Community 39 - "Reading Pools and Architecture"
Cohesion: 0.23
Nodes (15): Audited legacy key map, Bundled typography, Daily calendar reminders, Dataset integrity checks, English Arabic reading language, Future search, Future topic browsing, Hadith Pull static website (+7 more)

### Community 40 - "navigation"
Cohesion: 0.26
Nodes (15): cycle(), hold(), initContact(), initSwipe(), loadPage(), mount(), pageKey(), show() (+7 more)

### Community 41 - "Narration Text and Grades"
Cohesion: 0.18
Nodes (17): arabicCollection(), arabicGrade(), arabicNumber(), arabicReference(), buildExcerpt(), copyHadith(), gradeClass(), gradeLabel() (+9 more)

### Community 42 - "Share Card Generation"
Cohesion: 0.24
Nodes (17): buildCard(), canvasToBlob(), cardFileName(), cardIsPhoto(), centreArtwork(), chooseArtwork(), copyCardImage(), downloadBlob() (+9 more)

### Community 43 - "search"
Cohesion: 0.30
Nodes (15): empty(), init(), initFilterDisclosure(), keep(), loadingResults(), paintRecents(), queryWorker(), removeRecents() (+7 more)

### Community 44 - "About and Source Traceability"
Cohesion: 0.26
Nodes (13): Android Google Play link, Arabic source preservation, https://github.com/aarahman04, https://play.google.com/store/apps/details, https://sunnah.com/, https://www.instagram.com/aarahmans/, https://www.linkedin.com/in/aarahman04/, Local-time calendar reminders (+5 more)

### Community 45 - "Reader Language and Expansion"
Cohesion: 0.22
Nodes (15): step(), applyClamp(), generateStars(), hasArabicWorthShowing(), initClamp(), initDock(), initReader(), initShortcuts() (+7 more)

### Community 46 - "Historical Build Report"
Cohesion: 0.18
Nodes (8): data\v1\report.txt, Grade vocabulary normalization, Historical v1 pipeline report, Self-contained narration filtering, data/v1/, data/v1/dehlawi/, data/v1/nawawi/, data/v1/qudsi/

### Community 47 - "ANDROID WEB PARITY"
Cohesion: 0.25
Nodes (11): Authoritative Android asset sync, Android-to-web feature and source matrix, Production route and action inventory, Chain, look and tab browser verification, Six-screen scene wrap, Offline narrator shard synchronization, Narration chain and narrator profile dialog, Subpixel scene seam correction (+3 more)

### Community 48 - "docs"
Cohesion: 0.23
Nodes (10): Source-backed Arabic reference metadata, Search and Describe mode persistence, Narration paging and focus controls, Active Categories reset and Escape routing, Latest explicit narration supersedes random draw, Tab transition token and lazy preload recovery, Read-from picker interaction review, docs/ (+2 more)

### Community 49 - "ANDROID WEB 2026 11 05"
Cohesion: 0.16
Nodes (8): Android full verification host ashmem failure, Android focused verification results-file lock, Android isolated verification Gradle success, Recorded Android build and verification limits, Stopped-server offline browser verification, Native search oracle verification, 29 focused web asset and offline tests passed, 68 historical web verification tests passed

### Community 50 - "verification"
Cohesion: 0.14
Nodes (5): Mobile reminder calendar export, Desktop category theme transition, Mobile saved narration in a bookmark folder, Recently read after offline upgrade cancellation, docs/verification/

### Community 51 - "index"
Cohesion: 0.16
Nodes (6): json(), read(), index, outputs, source, sourceHash

### Community 52 - "occasions"
Cohesion: 0.32
Nodes (13): epoch(), escape(), forbidden(), fromEpoch(), key(), local(), pad(), calendar() (+5 more)

### Community 53 - "Theme and Grade Controls"
Cohesion: 0.24
Nodes (14): apply(), flip(), paint(), roll(), applyTheme(), initAppearance(), initTheme(), lookThumb() (+6 more)

### Community 54 - "Behavior Tests and Reminders"
Cohesion: 0.22
Nodes (6): swipe(), read(), settle(), site(), click(), source()

### Community 55 - "Dataset Loading and Lookup"
Cohesion: 0.21
Nodes (12): countOf(), findRecord(), gradeFilter(), loadArabicMetadata(), loadGradeCodes(), loadIndex(), loadLegacy(), loadReadingPools() (+4 more)

### Community 56 - "Main Reader Page"
Cohesion: 0.35
Nodes (9): Copy Save Share actions, Folder save dialog, Full source reference, Grade filter, https://hadithpull.online/, https://sunnah.com/, Keyboard shortcuts, Language toggle (+1 more)

### Community 57 - "occasion controls.test"
Cohesion: 0.22
Nodes (6): json(), load(), root, button(), node(), Topics

### Community 58 - "Behavior Tests and Reminders"
Cohesion: 0.22
Nodes (7): Bookmark library page, https://sunnah.com/, Reference-bearing 1080 square card, Share image dialog, hadith, read(), reader()

### Community 59 - "BOOKMARK READING 2026 11 06"
Cohesion: 0.31
Nodes (7): Bookmark folders and saved narration sheets, Canonical bookmark-source reading, Search loading and stale-scroll guard, Android topic-card display parity, Category route, scroll and cached pagination, Animated reference dock and reading action rows, Language and mode controls during motion

### Community 60 - "ANDROID TO WEB PARITY"
Cohesion: 0.38
Nodes (9): Parity brief: browser calendar and daily content, Parity brief: Categories arrangement and topic flow, Parity brief: authoritative data sync, Parity brief: local SQLite search equivalence, Parity brief: offline version and migration behavior, Parity brief: taxonomy report contract, Android-to-web parity implementation brief, Parity brief: scoped draws and reading history (+1 more)

### Community 61 - "Final 320px category layout"
Cohesion: 0.20
Nodes (5): Final 320px category layout, Light 320px category layout, Dark 360px category layout, Dark desktop category grid, Final desktop category shelf layout

### Community 62 - "Bookmark Page and Sharing"
Cohesion: 0.27
Nodes (8): Apple touch icon, Gold curved upward arrow, Dark green calligraphic brand mark, Transparent icon background, 23 October navigation release, 23 October shared dataset release, 26 October Arabic release, https://sunnah.com/

### Community 63 - "Logo Design Assets"
Cohesion: 0.31
Nodes (8): logos and favicons/, Cream app-icon background, Gold curved upward arrow, Deep green calligraphic mark, Hadith Pull cream-background app logo, Gold curved upward arrow, Deep green calligraphic mark, Hadith Pull standalone logo

### Community 64 - "Navigation Sheets and Dialogs"
Cohesion: 0.24
Nodes (10): release(), SiteNavigation, askDialog(), submit(), closeMenu(), closeSheet(), enableSwipeToClose(), initSheets() (+2 more)

### Community 66 - "daily"
Cohesion: 0.31
Nodes (5): Daily, data/notifications/, assets(), paint(), settings()

### Community 68 - "Dataset Build Pipeline"
Cohesion: 0.22
Nodes (7): tools/, tools/oracle/, DATA, eligible, grades, index, lines

### Community 70 - "Behavior Tests and Reminders"
Cohesion: 0.25
Nodes (4): Parity, read(), reader(), root

### Community 71 - "Main"
Cohesion: 0.39
Nodes (5): json(), list(), main(), text(), SQLiteDatabase

### Community 72 - "ANDROID PARITY 2026 11 22"
Cohesion: 0.46
Nodes (7): Foldable chain routes and persistent Read action, New Hadith sink and rise, Release asset hash gate, Arabic place-look names, Android 2.0 web parity release, Cross-width tab slide, Classic and place sun/moon roll

### Community 73 - "WEB IMPLEMENTATION 2026 11 05"
Cohesion: 0.39
Nodes (6): Browser report CORS deployment dependency, Versioned and integrity-checked offline caching, Daily selections and calendar export, Canonical narration sheet actions, Persistent wrong-topic report queue, Local FTS4 and BM25F browser engine

### Community 74 - "GitHub Pages Deployment"
Cohesion: 0.43
Nodes (6): .github\workflows\static.yml, GitHub Pages deployment, Node test gate, Serialized deployment, .github/, .github/workflows/

### Community 75 - "Android to web browser verification evidence"
Cohesion: 0.33
Nodes (4): Android to web browser verification evidence, Mobile Describe results for Eclipse Prayer, Final 320px narration detail, Final desktop narration detail

### Community 76 - "SVG Favicon Design"
Cohesion: 0.52
Nodes (6): SVG favicon, Embedded PNG bitmap in SVG wrapper, Gold curved upward arrow, Dark green calligraphic brand mark, RealFaviconGenerator, Transparent icon background

### Community 77 - "Social Preview Design"
Cohesion: 0.52
Nodes (6): Arabic narration about intentions, Cream geometric patterned background, Hadith Pull, Hadith Pull social preview card, A random narration, with its reference, hadithpull.online

### Community 79 - "build narrators"
Cohesion: 0.48
Nodes (6): build(), note(), fnv1a(), Turn Android's narrators.db into small JSON shards the website fetches on…, Same as Narrators.shardOf in narrators.js., write()

### Community 80 - "sync android"
Cohesion: 0.40
Nodes (3): digest(), Copy authoritative Android assets; never rebuild or relabel religious content.…, sync()

### Community 81 - "Desktop Children and Parenting detail"
Cohesion: 0.33
Nodes (3): Landscape topic detail and Read handoff, Desktop Children and Parenting detail, Mobile category finder for parents

### Community 82 - "export category art"
Cohesion: 0.40
Nodes (3): custom(), Export the approved CategoryArt.kt paths and shared mappings, not replacement…, resolve()

### Community 83 - "Behavior Tests and Reminders"
Cohesion: 0.47
Nodes (5): localDate(), pad(), REMINDER_SLOTS, reminderCalendar(), reminderForm

### Community 84 - "reading source.test"
Cohesion: 0.47
Nodes (5): Parity, read(), require, source(), node()

### Community 85 - "Repository Working Guidelines"
Cohesion: 0.70
Nodes (3): Goal-driven verification, Simplicity first, Surgical changes

### Community 86 - "Reading Pools and Architecture"
Cohesion: 0.50
Nodes (4): data\v2\pools.txt, Hadith reading pools version 3, Grade discovery index, Uniform eligible narration draw

### Community 87 - "ANDROID PARITY 2026 11 21"
Cohesion: 0.70
Nodes (4): Android parity issue checklist, Place crossfade and scrolling stars, Source draw rounds and empty grade intersections, Wide desktop reading frames

### Community 88 - "PLACE LOOKS 2026 11 17"
Cohesion: 0.70
Nodes (4): Place look visual audit, Place doors, turns, sunset and reduced motion, Canvas place scenes from Android, Widget place-look adaptation

### Community 90 - "DomainStubs"
Cohesion: 0.70
Nodes (4): Grading, SAHIH, Hadith, Primary

## Knowledge Gaps
- **119 isolated node(s):** `ICONS`, `Daily`, `datasetId`, `androidOnly`, `REPORT_ORIGINS` (+114 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 858 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **40 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Hadith-Pull` connect `Contact and App Redirect` to `sql wasm`, `places`, `Reader State and Elements`, `Bookmark Library Interface`, `topics`, `search engine`, `License Page and Manifest`, `parity core`, `narrators`, `search parity.test`, `card`, `Font License Terms`, `Privacy and Local Storage`, `card art`, `data`, `Google Play Policy Reference`, `Behavior Tests and Reminders`, `Sunnah API Reference`, `Reading Pools and Architecture`, `navigation`, `search`, `About and Source Traceability`, `docs`, `occasions`, `Main Reader Page`, `Behavior Tests and Reminders`, `Bookmark Page and Sharing`, `Logo Design Assets`, `daily`, `Dataset Build Pipeline`, `Behavior Tests and Reminders`, `GitHub Pages Deployment`, `Social Preview Design`, `reports`, `Behavior Tests and Reminders`, `Repository Working Guidelines`?**
  _High betweenness centrality (0.366) - this node is a cross-community bridge._
- **Why does `.github/` connect `GitHub Pages Deployment` to `Contact and App Redirect`?**
  _High betweenness centrality (0.003) - this node is a cross-community bridge._
- **Why does `Android to web browser verification evidence` connect `Android to web browser verification evidence` to `Exported 1080px Bukhari 1 share card`, `Mobile available offline status`, `Final desktop Search landing`, `ANDROID WEB 2026 11 05`, `Final 320px category layout`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `ICONS`, `Daily`, `datasetId` to the rest of the system?**
  _119 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `chains` be split into smaller, more focused modules?**
  _Cohesion score 0.007782101167315175 - nodes in this community are weakly interconnected._
- **Should `Dataset Manifest Entries` be split into smaller, more focused modules?**
  _Cohesion score 0.027298850574712645 - nodes in this community are weakly interconnected._
- **Should `people` be split into smaller, more focused modules?**
  _Cohesion score 0.015503875968992248 - nodes in this community are weakly interconnected._