/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        wavo: {
          green:   '#0F8F6F',
          deep:    '#065F46',
          action:  '#087F5B',
          foam:    '#129F78',
          mist:    '#E8F7F0',
          sand:    '#F8FAF9',
          sidebar: '#064E3B',
          card:    '#FFFFFF',
          border:  '#E4ECE7',
          dark:    '#064E3B',
          text:    '#17201C',
          muted:   '#64716B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
};
