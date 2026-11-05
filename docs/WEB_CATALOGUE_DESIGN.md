# Web catalogue direction — 2026-11-05

The owner explicitly clarified that the Android cards must remain untouched and the website can use the wider canvas creatively. Visual arrangement changes remain in the web repository; the later explicit request also adds a Search/Describe fade in Android. The approved membership, labels, identities, hidden decisions and SVG subjects stay shared; their presentation is adapted for the browser.

## References investigated

- [IBM Carbon tile guidance](https://carbondesignsystem.com/components/tile/usage/): related tiles aligned to a grid, clear hierarchy, visible interactive affordances and consistent variants inside groups.
- [Skyscanner Backpack card lists](https://www.skyscanner.design/latest/components/card-list/overview-TcDlJyFZ): collection headings and independent responsive arrangements; desktop grids help scan more content, while small screens need a different composition.
- [Scottish Government navigation cards](https://designsystem.gov.scot/components/card): concise navigational cards with a single action, appropriate heading structure, and whole-card hover/focus feedback.

These are pattern references. No framework, paid component, remote design job or third-party runtime was introduced.

## Chosen composition

A centered page title and finder lead into a full-width sequence of shelves. Shelf labels stay small, left-aligned and quiet, using a restrained web hierarchy. There is no sidebar. Searching replaces the shelves with readable full-name results.

The opening shelf has one larger Prophet ﷺ card beside two compact cards for Faith and the Qur’an. Subsequent shelves use balanced two-, three- or four-column desktop rows, quiet surfaces, compact teal marks, two-line names and a directional affordance. Inside a subject, a full-name banner provides context and grouped topic tiles become a readable responsive grid. Phones retain two-column category cards and full-width topic rows where space requires them.

The house palette remains parchment #f6f2ea, ink #1c1917, teal #0f766e and gold #a97e3c; dark mode uses the existing #0a0f14 background and teal accent. Cormorant carries headings and category names; Inter handles controls and metadata; Scheherazade remains the Arabic face. Spacing, focus, reduced motion and touch behavior use the existing site tokens. The single expressive element is the opening featured shelf; the remaining cards stay disciplined and easy to scan.

The earlier four-column uniform draft was replaced after the owner asked for a more intentional web-specific design. Android card presentation was not edited. A subsequent review removed the sidebar and centered shelf headings. Four cards now fill one desktop row; ten fill 4/3/3. At medium widths they rebalance to 2/2 and 3/3/2/2, with no isolated final card. See the verification document and screenshots for the final browser checks.

## Search and narration interaction

[Carbon content switcher guidance](https://www.carbondesignsystem.com/building-blocks/core/components/content-switcher/guidelines) informed the quiet Search/Describe control within the existing Search tab. [GOV.UK heading guidance](https://design-system.service.gov.uk/styles/headings/) informed the consistent semantic hierarchy with intentionally restrained shelf labels. These are adapted principles, not copied visual systems.

Search has an integrated magnifier, plain recent-query rows, quiet remove icons and a small text Clear action for history. Search/Describe retain independent in-session drafts and fade in both directions, respecting reduced motion. Narration sheets rise from the bottom on phones, with compact top paging, English/Arabic control, an X close icon, unobtrusive source links and a fixed Copy/Save/Share row. Arrow keys and horizontal swipes change the opened narration. Nested sheets and text selection do not accidentally page the underlying detail.

Narration result summaries have a consistent height. Full narration details use a fixed viewport frame, fixed reference header, independently scrolling text and an attribution/source/report block below the text. The same En/ع control as Read operates locally within the detail; text length and language never resize the frame.
