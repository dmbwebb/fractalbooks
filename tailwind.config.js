// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // or wherever you keep your files
    // ...other paths
  ],
  theme: {
    extend: {
      fontFamily: {
        // This means when you use "font-serif", it will be Merriweather first, then fallback to generic serif.
        'serif': ['Merriweather', 'serif'],
      },
    },
  },
  plugins: [],
};
