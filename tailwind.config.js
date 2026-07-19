/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#16274F',
          light: '#233B6E',
          dark: '#0E1A38',
        },
        forest: {
          DEFAULT: '#145C34',
          light: '#1B7645',
          dark: '#0D3E23',
        },
        cream: '#F6F3EC',
        paper: '#FFFFFF',
        ink: '#23262B',
        gold: '#C08A2E',
        line: '#E4DFD3',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
