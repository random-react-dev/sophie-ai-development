/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Application Theme Colors
        background: "#ffffff", // Page background - white
        surface: "#f8fafc", // Card/box background - slate-50
      },
    },
  },
  plugins: [],
};
