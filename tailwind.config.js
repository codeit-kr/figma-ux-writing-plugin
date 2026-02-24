/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/ui/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      fontSize: {
        '2xs': '0.625rem',
      },
    },
  },
  plugins: [],
};
