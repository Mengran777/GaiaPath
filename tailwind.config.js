// tailwind.config.js
const colors = require("tailwindcss/colors");
const palette = require("./src/styles/palette");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ...palette,
        // Warm grays instead of Tailwind's default cool (blue-tinted) gray,
        // so existing `gray-*` classes match the warm brand palette.
        gray: colors.stone,
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
