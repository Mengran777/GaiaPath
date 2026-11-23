// Single source of truth for GaiaPath colors.
// Used by tailwind.config.js (as utility classes, e.g. `bg-brand-900`) and
// imported directly where a color is needed in JS (inline styles, map layers).
//
// Usage guide:
//   brand-900  primary actions, headings        brand-500  accent: focus, selection, links
//   brand-700  primary hover                    brand-50…200  tinted backgrounds/borders
//   gold-*     secondary accent: favorites, AI-edited items, highlights
//   ink-*      text (ink > soft > muted > faint)
//   line-*     borders and dividers
//   surface-*  warm off-white backgrounds
//
// Current look: Notion-like. Warm near-black ink for actions and headings,
// a single blue accent, soft warm grays, very light borders.

/** @type {const} */
const palette = {
  brand: {
    950: "#191919",
    900: "#37352f",
    700: "#55534e",
    500: "#2383e2",
    300: "#529cca",
    200: "#d3e5ef",
    100: "#e7f3f8",
    50: "#f1f8fb",
  },
  gold: {
    700: "#a87b16",
    500: "#dfab01",
    200: "#f3e3b3",
    50: "#fbf3db",
  },
  ink: {
    DEFAULT: "#37352f",
    soft: "#5f5e5b",
    muted: "#9b9a97",
    faint: "#c3c2c1",
  },
  line: {
    DEFAULT: "#e9e9e7",
    strong: "#dfdfde",
  },
  surface: {
    DEFAULT: "#f7f7f5",
    dim: "#f1f1ef",
  },
};

module.exports = palette;
