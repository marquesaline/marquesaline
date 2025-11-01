/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./**/*.html",
    "./**/*.md",
    "./_posts/**/*"
  ],
  theme: {
    extend: {
      colors: {
        'bg-main': '#2F3A46',
        'bg-secundary': '#26323E',
        'text-primary': '#E4E1DC',
        'text-secundary': '#9AA4AE',
        'accent': '#C2CBD4',
        'border': '#3C4853',
        'icon': '#B7BEC7'
      },
      fontFamily: {
        sans: ['Playfair Display', 'sans-serif'],
        serif: ['Source Serif Pro', 'serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    },
  },
  plugins: [],
}