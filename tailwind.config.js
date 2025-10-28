/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // --- Add this colors block ---
      colors: {
        'primary-blue': '#667eea',     // Your custom blue
        'secondary-purple': '#764ba2', // Your custom purple for hover
        'text-dark': '#2c3e50',       // Custom text dark
        'text-light': '#8492a6',      // Custom text light
      }
      // --- End of colors block ---
    },
  },
  plugins: [],
}