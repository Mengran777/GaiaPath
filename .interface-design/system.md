# Gaia design system

Decisions are made; hold to them. Source of truth for values: `src/styles/palette.js`,
`tailwind.config.js` and the component classes in `src/app/globals.css`.

## Direction and feel

Editorial travel magazine (inspired by Kinfolk): white paper, black ink, the
destination photography carries all the colour. Calm, slow, confident. The UI
never competes with the photos.

- Serif display for questions, titles and option labels; compact grotesk for UI text.
- No UI colour except two warm tints: **sand** (selected backgrounds) and
  **terracotta** (map route, AI changes, the one accent), plus one
  **destination field**: a pale tone taken from the route's cover photo behind
  the itinerary title (see below).
- States are expressed by **lightness**, not coloured borders: resting 60% →
  hover 100% → selected 100% plus a marker or sand fill.
- No checkmarks, no text arrows (← › etc.), no emoji, no gradients (except a
  dark scrim behind text on photos, and the edge fade on inner scroll areas), no drop shadows.
- No visible scrollbars anywhere; inner scroll areas use `.scroll-fade` + `useScrollFade`
  (top/bottom edge fades only while there's more content that way).
- Square corners everywhere, pills and chips included. Nothing is round except loading spinners.

## Tokens

| Role | Value |
|---|---|
| Paper | `#ffffff` |
| Ink (text, primary actions, rules) | `#111111` (`brand-900`, `ink`) |
| Ink soft / muted / faint | `#333333` / `#6b6b6b` / `#bdbdbd` |
| Hairline | `#e8e8e8` (`line`), strong `#d9d9d9` |
| Surface (hover, skeletons) | `#f7f6f3` / dim `#f2f0ec` |
| Sand (selected) | `#e9e2d4`; lighter `#f3eee4` (`brand-100`), `#faf8f4` (`brand-50`) |
| Terracotta (accent) | `#a65a3a` (`brand-500`, `gold-500`) |

Fonts: `--font-display` Newsreader (weight 400 only, tracking -0.01em);
`--font-sans` Inter Tight.

## Type scale

- Question / page title: serif 44–48px, uppercase, line-height 1.04
- Section title: serif 22–30px, sentence case, black 1px rule underneath
- Card title: serif 20–22px (moving to 20px sentence case, see Pending)
- Option labels: serif 17–32px depending on prominence
- Body: sans 14–15px, line-height ~1.6
- Eyebrow (`.eyebrow`): sans 11px, uppercase, tracking 0.08em, `#6b6b6b`

## Depth and spacing

- Depth strategy: **flat**. Hierarchy from rules (1px ink for sections, hairline
  for rows), whitespace and type size. Floating layers (menus, popovers) get a
  hairline ring `0 0 0 1px #e8e8e8`, never a shadow.
- Spacing base 4px; generous vertical rhythm (24–40px between groups).

## Motion

- Easing: `cubic-bezier(0.25, 1, 0.5, 1)` (`ease-editorial`) for all UI motion.
- Durations: 0.35–0.6s for state changes, 0.55s for wizard slides, 0.7s for
  photo zoom (scale 1.04 max).
- Lozenge marker wipes in once (`clip-path`) on hover; static when selected; never loops.
- Respect `prefers-reduced-motion` (global rule in globals.css).

## Accessibility and polish (house rules)

- Keyboard focus: global `:focus-visible` outline, 1px ink, 3px offset. Underline
  fields use their ink underline instead. Never remove focus without a replacement.
- Transitions list their properties; never `transition: all`. Prefer
  `transform`/`opacity`; progress bars use `scaleX`, not `width`.
- Text actions instead of glyphs: "Previous", "Next", "Close", "Dismiss" in
  11px uppercase; no ‹ › × arrows or icon-only buttons without labels.
- Toasts: ink bar with a lozenge (errors: white with red text and "Error"), in a
  polite live region. No check or cross icons.
- Dates through `src/lib/format.ts` (Intl), not hand-typed month names.
- Placeholders show an example and end with "…".

## Component patterns

- **Primary button** (`.btn-ink`): black block, 48px h (40px compact), 0 32px pad,
  0 radius, sans 12px uppercase tracking 0.1em; hover opacity 0.75.
- **Quiet action** (`.link-quiet`): ink at 60% → 100% on hover. Back, Edit, Cancel.
- **Text field** (`.field-line`): underline only, 1px `rgba(17,17,17,.2)`,
  darker on hover, ink on focus. Hero fields use serif 26px centred.
- **Option** (`.pill-sand`): square, serif, no fill at rest, 6% ink on hover, sand when
  `aria-pressed`/`aria-checked`.
- **Chip** (`.chip-line`): square, serif, white with hairline ring `#e6e1d7`, sand on hover.
- **Press feedback**: `.btn-ink`, `.pill-sand`, `.chip-line` shrink to `scale(0.97)` on
  `:active`, 160ms `cubic-bezier(0.23, 1, 0.32, 1)`.
- **Lozenge option** (`.loz-opt` + `.loz-mk` + `.loz-tx`): the selected/current
  marker is a small filled diamond (`<Lozenge />`), 0.38em, wipes in from the left.
  Outline lozenge = "Save", filled = "Saved".
- **Photo gallery tile**: portrait 3:4, hover dims siblings to 40% and zooms the
  hovered photo; city serif uppercase + country eyebrow below; Unsplash credit on hover.
- **Interest tile**: square photo, greyscale at rest, colour returns on hover,
  full colour when selected (`src/data/interestPhotos.ts`).
- **Route card**: portrait 4:5 photo; meta "I · Classic · 5 days" (eyebrow);
  serif 20px sentence-case title, max 2 lines. Description (3 lines) and the
  Unsplash credit appear on the photo on hover/focus over a dark scrim; Save is a
  32px white square with a lozenge on the photo's top-left. AI titles are asked
  to be 2–5 words, sentence case, no city name (single_route_prompt.txt).
- **Composer** (Ask Gaia): sand-50 box, hairline ring `#e6e1d7` (ink on focus),
  2-row textarea, Ask button inside bottom-right (35% opacity when empty), hint
  "Enter to send · Shift + Enter for a new line". Suggestion chips above it are
  square outlined chips (`.chip-line`) that fill the box on click (they never send directly).
- **Missing photos**: stop photos search name + city → name → city + kind
  (`src/lib/stopPhotoSearch.ts`). If all miss: row shows a 56px sand-100 tile with a
  2-letter serif monogram; the drawer shows a 16:9 sand-100 panel with the stop
  name in serif 26px and "No photo found". Route covers fall back to the theme's
  backup set (`src/data/routeCoverFallbacks.ts`), then a sand-100 panel with title.
- **Itinerary stop row**: time column (86px), serif title, small photo; selected
  row sand-50; edit mode swaps the photo for Edit / Remove text actions.
- **Modal**: white panel, 40% black scrim, no radius, eyebrow + serif uppercase title.

## Voice

- A touch poetic, still plain: "Where will you wander?", "When do you set out?", "Unfolding the map", "Kept with your trips." One image per line at most; functional labels (Edit, Next, Email, Pace options) stay literal.

## Itinerary page structure (editorial)

Mockup: `.interface-design/mockups/itinerary-editorial.html`. One page scroll, three layers:

1. **Opening spread** (`RouteOpening`, full width above everything on wide screens): cover photo left, sticky under the header while the right side scrolls; right side on the destination field: All routes / Save, title (76px uppercase), dates, the route description as lede, up to four of the trip's own photos (2×2, staggered, serif captions, nothing over the photo). Phones: cover on top, words below, inside the list.
2. **At a glance** (top of the list column): "At a glance" 48px, "N days · N stops", Edit on the right; per day the numeral + date over an ink rule, every stop as time + name (click jumps to the stop and opens it), then "N stops · Directions". The map beside it shows the whole trip.
3. **Days**: each starts with a day opener, the day's first stop photo (78vh, overflow-clip) under a sticky white numeral (112px) and date, with a top-left dark scrim; clicking it shows the day on the map. Then the stop rows.
- **Header scrolls away** on the itinerary page (like Kinfolk). Once past the opening a slim white **index bar** (3rem, fixed, portalled to body) slides down from the top: "At a glance · I · Thu 10 · II · Fri 11" on the left, the pane icon on the right; the section in view is ink with a small lozenge (no underline). The opening cover sticks at top 0; the map pane at top-16 under the bar; day numerals at top-12.
- **Hover** on overview rows: a quiet sand wash (`brand-50`), never an underline.
- **Photo hovers**: normal hand cursor, never a label or magnifier. Highlights and day openers: the photo drifts ~4% closer inside its frame (1.1–1.4s, editorial ease). Opened stop: the lead photo and thumbnails drift closer. **Nothing is ever written over a photo on hover** (no description, credit or count); route cards show the description only as the opened route's lede. Photo viewer: the left/right thirds turn the page, with a faint dark edge shade on hover. Highlights in the opening are clickable and open their stop.
- **Map follows the scroll**: overview in view shows the whole trip, a day's section shows that day (no pane opening, no scrolling).
- **Stop rows are bare**: time + name (22px serif) only; rating and price live in the opened stop under the description; no thumbnail.
- No small labels like "Day I" or "Directions" beside day headings.

## Itinerary context pane
- Right half of the itinerary page (wide screens) is a pane showing the map or one stop's photos. It starts open on wide screens (beside the overview and the days); phones keep the map under the list and use the fullscreen Lightbox for photos.
- Opening rules: choosing a day (day tabs or a day's heading) opens it. Opening a stop opens it, and closing that same stop closes it again; if the pane was already open (a day, the icon), closing a stop leaves it open. Switching from one stop to another keeps it open and moves the map. After the traveller closes the pane with the icon, opening stops won't reopen it; choosing a day or the icon will.
- Pane icon: a framed right column (filled while open) at the end of the header index, ink-muted, no border. It never sits over the map or photos.
- Motion: list and pane are both fixed at half width (minus the 40px gap) and never resize. Closed, the list sits centred (translateX(50% + 20px)); opening slides it left while the pane slides in from the right with opacity, 700ms editorial ease. Transform and opacity only, so the map is never redrawn mid-animation.
- Destination field: the itinerary's opening block (back link, actions, title, dates) sits on a pale tone of the route's cover photo (`lib/photoTone.ts`: 12 hue families, strongest wins, lifted to L 88% / S 26–45%), sand `#f3eee4` when there's no photo or it can't be read. Fades in over 700ms.
- Scrolling (wide screens): the itinerary page scrolls as a whole, like a magazine; no inner scroll box. The header scrolls away; the slim index bar takes its place. Jumps land just below the bar. Scrollbars are hidden everywhere (globals.css). Phones keep a fixed layout (list scrolls above a short map).
- Photos: clicking a photo swaps the pane to PhotoViewer (opens the pane if closed). A "Map view" text link (11px uppercase, before the credit) under the photo, or Esc, returns to the map. No mini map over the photo. No line above the photo; credit and thumbnails below; note in serif.
- Single day selected: terracotta route line (#a65a3a, 2px), stop numbers beside lozenges, travel-time labels at leg midpoints, white summary strip ("Day II · 3 stops" / "5.4 km · 20 min moving") placed bottom-11, above the Mapbox logo and attribution (which must stay visible). Scale bar sits top-right; zoom controls top-left. Clicking a marker opens and scrolls to that stop's row.
- Travel times (`lib/travelTimes.ts`, Mapbox Directions): walk ≤ 20 min → "N min walk"; self-drive → "N min drive"; else "about N min by transit" (drive × 1.3 + 8, rounded to 5). Transit is an estimate; Mapbox has no transit routing.
