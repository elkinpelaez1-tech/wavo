/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        wavo: {
          green:  '#1D9E75',
          deep:   '#0F6E56',
          foam:   '#5DCAA5',
          mist:   '#E1F5EE',
          sand:   '#FAF7EC',
          sidebar:'#F5F1DF',
          card:   '#FDFCF5',
          border: '#EDE8D0',
          dark:   '#0d1f1a',
          text:   '#2c2a1e',
          muted:  '#908c72',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
