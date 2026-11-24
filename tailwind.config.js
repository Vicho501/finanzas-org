/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Azul petróleo: el mismo del ícono de la app
        primary: {
          50:  '#eaf2f7',
          100: '#cfe0eb',
          200: '#a9c7da',
          300: '#7fabc6',
          400: '#5891b4',
          500: '#3a7aa2',
          600: '#2c6890',
          700: '#235879',
          800: '#1e4d6b',
          900: '#143652',
        },
        // Neutros fríos: fondo tipo niebla y bordes suaves
        surface: {
          50:  '#f7f9fa',
          100: '#eef2f4',
          200: '#e1e7eb',
          300: '#cdd6dc',
          400: '#aab6bf',
          500: '#8794a0',
        },
        ink: '#17232e',
        // Semántico
        income:  { DEFAULT: '#1c7a4e', light: '#e3f3ea' },
        expense: { DEFAULT: '#b4372f', light: '#fbe9e7' },
        caution: { DEFAULT: '#8a5a00', light: '#fdf3d8' },
      },
      fontFamily: {
        sans: ['"Atkinson Hyperlegible Next Variable"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Escala más grande que la de Tailwind: prioriza que se lea fácil
        xs:   ['0.8125rem', { lineHeight: '1.15rem' }],   // 13px
        sm:   ['0.9375rem', { lineHeight: '1.4rem' }],    // 15px
        base: ['1rem',      { lineHeight: '1.55rem' }],   // 16px
        lg:   ['1.125rem',  { lineHeight: '1.6rem' }],    // 18px
        xl:   ['1.375rem',  { lineHeight: '1.8rem' }],    // 22px
        '2xl':['1.75rem',   { lineHeight: '2.2rem' }],    // 28px
        '3xl':['2.5rem',    { lineHeight: '2.9rem' }],    // 40px
      },
    },
  },
  plugins: [],
}
