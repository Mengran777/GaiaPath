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
        // so existing `gray-*` classes match the warm palette.
        gray: colors.stone,
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      // Editorial look: square corners everywhere; only pills (rounded-full) stay round
      borderRadius: {
        none: "0px",
        sm: "0px",
        DEFAULT: "0px",
        md: "0px",
        lg: "0px",
        xl: "0px",
        "2xl": "0px",
        "3xl": "0px",
      },
      // No drop shadows; floating layers (menus, popovers) get a hairline ring instead
      boxShadow: {
        sm: "none",
        DEFAULT: "none",
        md: "none",
        lg: "0 0 0 1px #e8e8e8",
        xl: "0 0 0 1px #e8e8e8",
        "2xl": "0 0 0 1px #e8e8e8",
      },
      transitionTimingFunction: {
        editorial: "cubic-bezier(0.25, 1, 0.5, 1)",
      },
    },
  },
  plugins: [],
};
