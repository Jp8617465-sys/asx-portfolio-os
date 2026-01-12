/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"]
      },
      colors: {
        ink: "#121417",
        graphite: "#1E2127",
        mist: "#E7E9ED",
        paper: "#F7F7F5",
        accent: "#2F6FED",
        accentSoft: "#E6EEFF"
      },
      boxShadow: {
        card: "0 16px 40px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};
