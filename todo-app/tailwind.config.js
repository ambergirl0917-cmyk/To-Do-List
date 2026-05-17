/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pink: {
          50: '#FFF5F8',
          100: '#FDE8F0',
          200: '#FADDE8',
          300: '#F9D6E3',
          400: '#F4AFC8',
          500: '#E8829F',
          600: '#D4627F',
          700: '#B5476A',
          800: '#993556',
          900: '#7D2845',
        }
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
