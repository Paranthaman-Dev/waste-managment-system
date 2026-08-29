/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        earth: '#244033',
        leaf: '#3d8b5f',
        moss: '#dbeadf',
        clay: '#d98452',
      },
    },
  },
  plugins: [],
};
