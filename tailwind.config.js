/** @type {import('tailwindcss').Config} */
export default {
  content: ["./Front End/**/*.html", "./Front End/**/*.js"],
  theme: {
    extend: {
      fontFamily: {
        "source-sans": ["Source Sans 3", "system-ui", "sans-serif"],
        cormorant: ["Cormorant Garamond", "serif"],
      },
      colors: {
        forest: "#047857",
        "forest-dark": "#065f46",
        "forest-light": "#10b981",
        sky: "#0284c7",
        "sky-light": "#38bdf8",
        amber: "#f59e0b",
        "amber-light": "#fbbf24",
        "amber-dark": "#d97706",
        mint: "#ecfdf5",
        "mint-deep": "#d1fae5",
        ice: "#eff6ff",
        warm: "#fffbeb",
        slate: "#334155",
        ink: "#0f172a",
        paper: "#ecfdf5",
        "bg-site": "#ecfdf5",
      },
    },
  },
  plugins: [],
};
