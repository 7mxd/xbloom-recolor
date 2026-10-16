---
motifContract: 1
name: xBloom Recolor
updated: 2026-10-16
---

# xBloom Recolor design guide

xBloom Recolor is a one-page tool for xBloom owners who want a recipe card in their own colour: paste a share link, pick a colour, get a new link. It should feel like a calm, native iOS settings screen: system font, grouped white cards on a light grey page (black in dark mode), black pill buttons, and nothing decorative except the card itself. The one rule that matters most: the card preview looks exactly like the card in the xBloom app, so people can trust the colour they pick.

## 1. Brief

- **What it is:** a single page that opens an xBloom recipe from its share link, shows its details read-only, lets you choose the card's colour, and saves a recoloured copy with a new share link.
- **Who it is for:** xBloom coffee-machine owners, on their phones most of the time, who know the xBloom app but have never seen this tool before.
- **Personality:** quiet, native, precise, friendly.
- **Voice and tone:** short, plain sentences; numbered steps ("1 · Your recipe"); honest about being unofficial.

## 2. Direction

- **Style:** iOS grouped lists: Apple's system greys, the system font, cards with 14 px corners, pill buttons.
- **Starting preset:** none; extracted from the existing page (public/index.html) during Motif's review on 2026-10-15.
- **References:** the xBloom app's recipe cards (the card preview copies them); Apple's Settings app.
- **Approved mockups:** none yet. The review's screenshots (before and after) are kept outside the repository; `design/shots/` is local only.

## 3. Foundations

- **Colour:**
  - `background`: the page behind everything (system grey; black in dark mode).
  - `surface`: the white cards that group content (the recipe details, the colour box, the result). Nothing is raised above them, so `surface-raised` is the same colour.
  - `action-secondary` and `border`: the grey fill of the hex field and the secondary button, and the dividers inside cards.
  - `text-primary` / `text-secondary`: content / labels, notes and the footer.
  - `action-primary` / `on-action-primary`: the black pill buttons (white in dark mode) and their text.
  - `danger`: error messages. `accent`: the 7mxd link only (7mxd.me's blue). `success`, `warning` and `info` aren't used yet.
  - The card preview is the exception: it is drawn in the recipe's own colour, with its text 24% darker than the card, exactly as the xBloom app draws it. The small cards in the Recent list follow the same rule.
- **Type:** the system font, no web fonts. `display` 32 px bold for the page title; `title` 19 px for the recipe's name; `heading` 15 px semi-bold for the summary line and "Custom colour"; `body` 16 px for the lede, fields and buttons; `label` 13 px semi-bold, uppercase with wide spacing, for section labels; `caption` 12 px for the footer's small print. Hex codes use the mono font.
- **Spacing:** a 4 px scale. The page still uses some in-between values (10, 14, 18, 22 and 30 px); new work uses the scale.
- **Corners and elevation:** `md` (14 px) for cards, fields and the colour well; `sm` (10 px) for the card preview, like the xBloom app; `full` for buttons and swatches. No drop shadows: cards sit flat on the grey page, with a hairline on the preview and the swatches.
- **Icons:** stroke icons, 2 px, rounded ends, 20 px, in the text colour (the theme toggle's moon and sun).

## 4. Motion

- **Presses and small changes:** buttons shrink to 97% while pressed (`fast`) and fade when disabled (`base`). Nothing else moves.
- **Screens and sheets:** none; the editor appears in place when a recipe opens.
- **Lists and content:** content appears without animation.
- **Reduced motion:** the only motion is a tiny press feedback, which stays.

## 5. Components

| Component | Purpose | Variants | States |
|---|---|---|---|
| Button | Open, Save, Copy link | primary (black pill), secondary (grey pill), full width | default, pressed (97%), focused (system ring), disabled (45% opacity), loading ("Opening…", "Saving…") |
| Icon button | The theme toggle | round, 44 px | default, pressed, focused |
| Field | The share link and the hex code | text/URL, mono (hex) | default, focused (text-colour border), error (message below) |
| Card preview | Shows the recipe's card in the chosen colour | none | updates live as the colour changes |
| Recipe details | Grind and pours, read-only | none | none |
| Swatch | One preset colour | none | default, selected (ring), focused |
| Disclosure | "Custom colour" (hue, saturation, lightness, picker, hex) | none | closed (+), open (−), focused |
| Slider | Hue, saturation, lightness | none | default, focused |
| Message | Status and errors under a step | info, error | hidden, shown |
| Result | The new share link, the steps to save it, Copy link | none | hidden, shown, copied, copy failed |
| Recent list | The last 5 recipes opened or saved on this device, under the link box; a tap reopens one | none | hidden (nothing opened yet), open, folded (a recipe is open; one "Recent recipes +" row), opening ("Opening…" in the row), removed or cleared (inline message with Undo) |
| Recent row | One remembered recipe: a small card (40 px, `sm` corners, the recipe's colour, its pour count 24% darker), the name on one line, "cup · pours · when" ("Recoloured when" for a copy saved here), and × to remove it | none | default, pressed, focused, opening, disabled while another opens |

## 6. Patterns

- **Navigation:** one page, two numbered steps; the editor (step 2) appears once a recipe opens.
- **Recent recipes:** the page remembers the last 10 recipes opened in this browser (link, name, cup, pours, colour, when) and shows the newest 5, so removing one brings up the next. Nothing about them reaches the server. Opening one again moves it to the top. Saving a recoloured copy adds the copy at the top, in its new colour and marked "Recoloured", because its new link is otherwise shown only once; the original stays as it was, in its own colour, since its link still opens the original. While a recipe is open the list folds into one row, so step 2 stays near the top on phones. Removing a row or clearing the list happens at once and offers Undo; there is no "Are you sure?".
- **Forms:** the share link is required and must be a link; the app's own message explains a failure in one sentence under the step.
- **Empty, loading and error:** before a recipe opens, step 1 says what to paste and where it comes from. Buttons say what is happening while they wait. Errors appear under their step in `danger`.
- **Feedback:** inline messages only, read out by screen readers (`role="status"`, `aria-live`).
- **Modal or sheet:** never.

## 7. Accessibility

- Text meets WCAG 2.2 AA contrast (4.5:1, or 3:1 for large text and UI parts) in light and dark. The card preview's text copies the xBloom app and is exempt; its content is also given in words. The same goes for the Recent list's small cards, whose pour count is written beside them.
- Every tap target is at least 24×24 px, and 44×44 px on touch screens, apart from the preset swatches (31 px, so all 16 fit in two rows).
- Text can be enlarged to 200% without losing content.
- Every interactive element shows a visible focus ring.
- Layouts use start/end (not left/right), so right-to-left languages work.

## 8. Platform notes

None yet.

## 9. Do / Don't

- **Do:** keep the card preview identical to the xBloom app's card; use the colour roles above, never new greys; say what a button is doing while it waits.
- **Don't:** add decoration, gradients or drop shadows; use the accent colour for anything but the 7mxd link; add a third step.

## 10. Change log

- 2026-10-15 — Design guide extracted from the existing page (Motif review) — so later changes stay consistent — approved by the developer's request to run the whole review
- 2026-10-16 — Added the Recent list and Recent row components, the recent-recipes pattern, and the small cards' contrast exemption — so people can reopen a recipe with one tap — approved by the developer
- 2026-10-17 — Recent also remembers each saved copy, marked "Recoloured", next to the original — so a new link isn't lost once the page is left — approved by the developer
