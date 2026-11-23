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
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      // Notion-like: tighter corners and soft layered shadows with a 1px hairline ring
      borderRadius: {
        lg: "6px",
        xl: "8px",
        "2xl": "10px",
      },
      boxShadow: {
        sm: "0 0 0 1px rgba(15,15,15,0.04), 0 1px 2px rgba(15,15,15,0.06)",
        DEFAULT: "0 0 0 1px rgba(15,15,15,0.05), 0 2px 4px rgba(15,15,15,0.08)",
        md: "0 0 0 1px rgba(15,15,15,0.05), 0 3px 6px rgba(15,15,15,0.1)",
        lg: "0 0 0 1px rgba(15,15,15,0.05), 0 3px 6px rgba(15,15,15,0.1), 0 9px 24px rgba(15,15,15,0.2)",
        xl: "0 0 0 1px rgba(15,15,15,0.05), 0 5px 10px rgba(15,15,15,0.1), 0 15px 40px rgba(15,15,15,0.2)",
        "2xl": "0 0 0 1px rgba(15,15,15,0.05), 0 5px 10px rgba(15,15,15,0.1), 0 15px 40px rgba(15,15,15,0.2)",
      },
    },
  },
  plugins: [],
};
