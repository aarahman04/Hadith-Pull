# Place looks (2026-11-17)

About › Appearance › Look now offers six place looks beside Classic and the five earlier looks: Book (`manuscript`), Sea (`bahr`), Bab (`bab`), Court (`courtyard`), Oasis (`waha`) and Hira (`hira`). The names stored in `localStorage.look` are Android's `Look` enum names in lower case. Desktop was built first; phones use the same code at Android's own sizes.

## Where it lives

- `places.js` (new, loaded first by `navigation.js`): the scenes, frames and motion, redrawn on canvas from Android `ui/components/LookScenes.kt`, `ui/reader/ReadingPlaces.kt` and `ui/reader/PlaceTurns.kt` in the same units (a screen is 220 units, the place is five screens wide, one per tab). It exposes `Places.turn`, `Places.sunset`, `Places.change` and `Places.through`; the widget gets no-ops.
- `style.css`, at the end of the `LOOKS` block: the twelve palettes generated from `ui/theme/Colors.kt placeColors()`, the shape tokens, the scene layers (`#place`, `.place-*`) and the page rules for a place look.
- `script.js`: six `LOOKS` entries; `setLoading`, `applyTheme` and `setLook` hand the motion to `Places`.
- `topics.js` and `bookmarks.js`: opening and leaving a category, topic or folder goes through `Places.through`.

## What is there

- Scene under the header, calm ground below; the skyline is hushed once a page is scrolled. The five tabs are one place and the ground pans between them.
- Read is framed by the look (leaf, tablet between the waters, gate, court panel, tent, cave mouth). The text is inset from every border and curve by values taken from the frame's own shape.
- Light to dark is a sunset and dark to light a sunrise (2.2 s): the sun or moon sets to the right behind the skyline while the other rises on the left. The moon is a plain crescent.
- Changing look fades to the page's own ground and back (520 ms) when a place look is involved.
- New Hadith: Book curls the leaf away from its lower outer corner with its text; Sea closes the water and parts it; Bab shuts and opens the gate; Court draws lattice screens; Oasis drops the tent flap; Hira goes dark and light. No skeleton lines inside a place frame.
- The same door opens and leaves a category, topic or folder. It never takes a tap, and a second change starts from where the door stands.
- Only `transform` and `opacity` are animated. With `prefers-reduced-motion` nothing moves: light, look and narration change at once.
- `/widget/` shows the narration on the look's plain page with no scene or frame.

## Where the website differs from Android

- During the sunset the words fade out, change ink unseen and fade back; Android cross-fades two pictures of the whole screen.
- On a wide window the sun and moon rest right of centre (Bab: just clear of the wall's end) so they do not sit behind the tabs.
- Wide window only: the dock is a side panel right of the frame; Sea and Bab narrow Categories and Search to the path; Oasis starts pages lower, clear of the camp; the vine band is narrower; Oasis's tent palms stand with the frame; Hira's floor is deeper; stars reach lower.
- The Book's curl has the fold, the blank back and its shading, but not the ink showing through the paper.
- On other tabs the Book's curl carries a held copy of the page, not a picture of it.

- An opened category's banner is solid, so no skyline shows behind its title; Oasis starts it below the camp.
- A long narration scrolls inside its frame and its last line fades out short of the frame's foot.
- Wide window only: the Sea's open water ends in a lap on the sand (a phone ends it at the screen's edge), and the far range's shade comes in gradually.

- No art behind words: no star behind the header's words; a soft clearing behind each page title (Sea, Bab, Court, Oasis; wider on a wide window); a page's first heading starts below the skyline (Sea Search and Bookmarks, Bab, Court and Oasis Bookmarks).
- Wide window only: Bab's city starts 5 units lower, so its battlements do not stand behind the header's words.

## Checked (headless Chrome, 2026-11-17)

- Full audit: every look on every tab, light and dark, at 1440×810 and 390×844 (120 screens), read against the owner's rules; the faults found are the two entries above.

- Read in all six looks, light and dark, at 1440×810; one light each at 1024×768 and at 390×844; Sea and Bab at 1366×650 and 1920×1080.
- An opened category in all six looks, light and dark; Sea's Bookmarks and About unscrolled, day and night.
- Light change mid-run: Sea to night, Oasis to day, Book to day, Hira to night, Bab to day on a phone; and the end state.
- Look change through the veil; New Hadith mid-run in all six (Hira also on a phone); the door mid-run in Book, Sea and Court, its end in Bab, and a bookmark folder opened and left in Oasis.
- Scroll hush (0 unscrolled, 0.9 scrolled); reduced motion (the only animation left is the site's own loading dots); the widget; the picker showing twelve looks.
- Earlier looks: About, Categories and Bookmarks in Mushaf, Iznik, Mihrab, Riyad and Kufic, light and dark, are pixel-identical to the previous release (30 pages). Classic differs from itself run to run (random stars, drifting backdrop), so it was judged by eye only.
- 117 web tests pass.

## Not checked

- Safari and Firefox; phones narrower than 360 px; windows between 1100 and 1365 px wide other than 1366.
- Frame rate on a real device (headless screenshots show positions, not smoothness).
- Arabic reading inside each frame; Search with results open; a topic's narration list.
- Read in the earlier looks was not compared pixel for pixel (its narration is random).

## Known

- Sea, wide window: the side panel overlaps the right wall of water. It does not fit beside the wall below about 1700 px.
- Court, 721–1099 px: the water channel runs behind the Copy, Save and Share row, as on the phone.
