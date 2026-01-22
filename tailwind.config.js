/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#0f8073",
        "background-light": "#f7f8f8",
        "background-dark": "#191d1f",
      },
    },
  },
  plugins: [],
}

