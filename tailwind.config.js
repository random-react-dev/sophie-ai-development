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
      fontFamily: {
        // Google Sans Font Family Mapping
        // Regular weight (font-normal, font-sans)
        sans: ["GoogleSans-Regular"],
        normal: ["GoogleSans-Regular"],
        // Medium weight (font-medium, font-semibold)
        medium: ["GoogleSans-Medium"],
        semibold: ["GoogleSans-Medium"],
        // Bold weight (font-bold)
        bold: ["GoogleSans-Bold"],
      },
    },
  },
  plugins: [],
};
