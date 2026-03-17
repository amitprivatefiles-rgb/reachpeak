/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#DC4021',
          dark: '#B8341A',
          light: '#F4D3CC',
          lighter: '#FFF5F3',
        },
        secondary: {
          DEFAULT: '#1A1A2E',
          light: '#2D2D44',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
