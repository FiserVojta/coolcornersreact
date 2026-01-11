/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Inter var"', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif']
      },
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#dcecff',
          200: '#b6d6ff',
          300: '#82b5ff',
          400: '#4d93ff',
          500: '#2d75f5',
          600: '#1f5bd8',
          700: '#1b4ab3',
          800: '#193f92',
          900: '#163670'
        }
      },
      boxShadow: {
        card: '0 10px 40px rgba(15, 23, 42, 0.08)'
      }
    }
  },
  plugins: [],
};
