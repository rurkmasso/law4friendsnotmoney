/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        inter: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-playfair)", "Georgia", "serif"],
      },
      colors: {
        gold: "#b8963a",
        navy: "#1e3a5f",
        cream: "#f5f3ee",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
