/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand colours are CSS variables so the admin can change them at runtime.
        primary: { DEFAULT: v('primary'), dark: v('primary-dark'), light: v('primary-light') },
        secondary: { DEFAULT: v('secondary'), dark: v('secondary-dark') },
        ink: '#0b1324',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Outfit"', '"Plus Jakarta Sans"', 'ui-sans-serif', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15,23,42,.04), 0 8px 24px -8px rgba(15,23,42,.12)',
        lift: '0 2px 4px rgba(15,23,42,.06), 0 18px 40px -12px rgba(15,23,42,.22)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
      },
      animation: { 'fade-up': 'fade-up .35s ease-out both' },
    },
  },
  plugins: [],
};
