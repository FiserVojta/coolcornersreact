/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        display:  ['"Inter var"', 'Inter', 'system-ui', 'sans-serif'],
        body:     ['"Inter var"', 'Inter', 'system-ui', 'sans-serif'],
        label:    ['"Inter var"', 'Inter', 'system-ui', 'sans-serif'],
        headline: ['"Inter var"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#eaf2ec',
          100: '#c8ddcd',
          200: '#8fbe9c',
          300: '#5a9c6c',
          400: '#2d7a47',
          500: '#135f30',
          600: '#0d4a25',
          700: '#093a1d',
          800: '#062a15',
          900: '#041c0d',
        },
        accent: {
          700: '#163a5f',
          800: '#102a45',
          900: '#0a1c30',
        },
        ink: {
          strong:  '#1a1f1c',
          default: '#102a45',
          muted:   '#163a5f',
          subtle:  '#6b7e91',
          faint:   '#a7b3c1',
        },
        page: '#faf7f2',
      },
      boxShadow: {
        card:         '0 10px 40px rgba(15, 23, 42, 0.08)',
        'card-hover': '0 20px 50px rgba(8, 49, 27, 0.14)',
        float:        '0 25px 60px rgba(15, 23, 42, 0.12)',
      },
    }
  },
  plugins: [],
};
