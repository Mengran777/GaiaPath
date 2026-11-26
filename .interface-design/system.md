# Gaia design system

Decisions are made; hold to them. Source of truth for values: `src/styles/palette.js`,
`tailwind.config.js` and the component classes in `src/app/globals.css`.

## Direction and feel

Editorial travel magazine (inspired by Kinfolk): white paper, black ink, the
destination photography carries all the colour. Calm, slow, confident. The UI
never competes with the photos.

- Serif display for questions, titles and option labels; compact grotesk for UI text.
- No UI colour except two warm tints: **sand** (selected backgrounds) and
  **terracotta** (map route, AI changes, the one accent).
- States are expressed by **lightness**, not coloured borders: resting 60% →
  hover 100% → selected 100% plus a marker or sand fill.
- No checkmarks, no text arrows (← › etc.), no emoji, no gradients (except a
  dark scrim behind text on photos), no drop shadows.
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

## Itinerary context pane
- Right half of the itinerary page is the map by default. Opening a stop's photo swaps it for `PhotoViewer` (map stays mounted underneath at opacity 0). "Back to map", Esc, clicking any itinerary row, or choosing a day returns to the map. Phones (< 768px) use the fullscreen Lightbox instead.
- PhotoViewer: eyebrow "Title · i of n", large photo with left/right thirds as prev/next, credit + thumbnail tabs below, stop note in serif. Arrow keys switch photos.
- Single day selected: terracotta route line (#a65a3a, 2px), stop numbers beside lozenges, travel-time labels at leg midpoints, white summary strip at the bottom ("Day II · 3 stops" / "5.4 km · 20 min moving").
- Travel times (`lib/travelTimes.ts`, Mapbox Directions): walk ≤ 20 min → "N min walk"; self-drive → "N min drive"; else "about N min by transit" (drive × 1.3 + 8, rounded to 5). Transit is an estimate; Mapbox has no transit routing.
- "Hide map" / "Show map" toggle sits in the same top-right corner in both states (wide screens only, remembered for the session in `gaia:map-hidden`). Hidden: list centers at max 760px and photos open fullscreen. Map zoom controls moved to top-left.
- Clicking a map marker opens and scrolls to that stop's row in the list.
