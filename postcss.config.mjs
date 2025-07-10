// // postcss.config.js

// module.exports = {
//   plugins: {
//     "@tailwindcss/postcss": {},
//     "postcss-preset-env": {
//       features: {
//         "nesting-rules": true,
//       },
//     },
//     autoprefixer: {},
//   },
// };
// postcss.config.mjs
const config = {
  plugins: {
    "@tailwindcss/postcss": {}, // Crucially, use the new plugin name for Tailwind CSS v4
    autoprefixer: {}, // Explicitly include autoprefixer
  },
};
export default config;
