// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // This simplified path is usually perfectly fine for v3 as well.
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    // If it doesn't work, you can use the more verbose one:
    // "./app/**/*.{js,ts,jsx,tsx,mdx}",
    // "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    // "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Your custom theme extensions
    },
  },
  plugins: [], // Ensure this is always an array, even if empty
};
