/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neu: {
          bg: '#e0e5ec',
          light: '#ffffff',
          dark: '#a3b1c6'
        }
      },
      boxShadow: {
        'neu-flat': '9px 9px 16px rgb(163,177,198,0.6), -9px -9px 16px rgba(255,255,255, 0.5)',
        'neu-pressed': 'inset 6px 6px 10px 0 rgba(163, 177, 198, 0.5), inset -6px -6px 10px 0 rgba(255, 255, 255, 0.5)',
        'neu-sm': '4px 4px 8px rgb(163,177,198,0.6), -4px -4px 8px rgba(255,255,255, 0.5)',
      },
      transitionDuration: {
        '500': '500ms',
        '700': '700ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'heavy': 'cubic-bezier(0.22, 1, 0.36, 1)',
      }
    },
  },
  plugins: [],
}