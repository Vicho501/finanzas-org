/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Azul petróleo institucional
        primary: {
          50:  '#e8f1f7',
          100: '#c5daea',
          200: '#9ec1db',
          300: '#77a8cc',
          400: '#5695c0',
          500: '#3582b4',
          600: '#2e72a0',
          700: '#245d84',
          800: '#1e4d6b',
          900: '#143652',
        },
        // Fondo papel cálido
        surface: {
          50:  '#fafaf8',
          100: '#f7f6f2',
          200: '#eeeae0',
          300: '#e0dbd0',
          400: '#ccc6b8',
          500: '#b8b2a4',
        },
        // Semántico
        income:  { DEFAULT: '#2d7a5b', light: '#e6f4ef' },
        expense: { DEFAULT: '#8b2e2e', light: '#f7eaea' },
      },
      fontFamily: {
        sans:  ['DM Sans', 'system-ui', 'sans-serif'],
        mono:  ['DM Mono', 'monospace'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
