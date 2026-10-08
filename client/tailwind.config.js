/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        serif: ["Georgia", "'Times New Roman'", "serif"],
      },
    },
  },
  plugins: [],
};
