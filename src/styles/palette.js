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

/** @type {const} */
const palette = {
  brand: {
    950: "#0a1a17",
    900: "#0d3d38",
    700: "#1a6b5e",
    500: "#2d9e8a",
    300: "#5dcaa5",
    200: "#cde8e4",
    100: "#e8f7f5",
    50: "#f0faf8",
  },
  gold: {
    700: "#9a6f30",
    500: "#c9a96e",
    200: "#e8d9b8",
    50: "#fdf4e7",
  },
  ink: {
    DEFAULT: "#1a1a1a",
    soft: "#4a4a4a",
    muted: "#8a8a8a",
    faint: "#b0b0b0",
  },
  line: {
    DEFAULT: "#e2ddd8",
    strong: "#d0ccc8",
  },
  surface: {
    DEFAULT: "#f5f2ee",
    dim: "#f0ede8",
  },
};

module.exports = palette;
