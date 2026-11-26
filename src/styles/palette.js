// Single source of truth for GaiaPath colors.
// Used by tailwind.config.js (as utility classes, e.g. `bg-brand-900`) and
// imported directly where a color is needed in JS (inline styles, map layers).
//
// Current look: editorial (magazine-like). White paper, near-black ink, no UI
// color. States are expressed by lightness; the only tints are a warm sand for
// selected backgrounds and terracotta for the map route and AI changes.
//
// Usage guide:
//   brand-900  ink: primary actions, headings     brand-700  primary hover
//   brand-500  terracotta accent: map route, focus, small highlights
//   brand-50…300  sand: selected/hover backgrounds and light borders
//   gold-*     terracotta family: favorites, AI-edited items
//   ink-*      text (ink > soft > muted > faint)
//   line-*     hairline borders and dividers
//   surface-*  very light warm backgrounds (hover, skeletons)

/** @type {const} */
const palette = {
  brand: {
    950: "#0b0b0b",
    900: "#111111",
    700: "#333333",
    500: "#a65a3a",
    300: "#c9b99a",
    200: "#e9e2d4",
    100: "#f3eee4",
    50: "#faf8f4",
  },
  gold: {
    700: "#8a4a2e",
    500: "#a65a3a",
    200: "#e8cfc2",
    50: "#f6ebe5",
  },
  ink: {
    DEFAULT: "#111111",
    soft: "#333333",
    muted: "#6b6b6b",
    faint: "#bdbdbd",
  },
  line: {
    DEFAULT: "#e8e8e8",
    strong: "#d9d9d9",
  },
  surface: {
    DEFAULT: "#f7f6f3",
    dim: "#f2f0ec",
  },
  sand: "#e9e2d4",
};

module.exports = palette;
