/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-app':         'rgb(var(--color-bg-app) / <alpha-value>)',
        'bg-surface':     'rgb(var(--color-bg-surface) / <alpha-value>)',
        'bg-hover':       'rgb(var(--color-bg-hover) / <alpha-value>)',
        'text-primary':   'rgb(var(--color-text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
        'text-muted':     'rgb(var(--color-text-muted) / <alpha-value>)',
        'overlay':        'rgb(var(--color-overlay) / <alpha-value>)',
        'primary':        '#E8772E',
        'primary-end':    '#F5A623',
        'accent':         '#F59E0B',
        'accent-end':     '#FB923C',
        'success':        '#10B981',
        'error':          '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #E8772E, #F5A623)',
        'gradient-accent':  'linear-gradient(135deg, #F59E0B, #FB923C)',
      },
    }
  },
  plugins: [],
}
