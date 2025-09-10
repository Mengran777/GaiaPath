// postcss.config.mjs (Correct for Tailwind CSS v4 Alpha/Next, which your error indicates you're using)
const config = {
  plugins: {
    // ⭐ Use the plugin name that the error message specified ⭐
    tailwindcss: {},
    autoprefixer: {},
  },
};
export default config;
