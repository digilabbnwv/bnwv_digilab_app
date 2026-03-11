/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-app':         '#0B1220',
        'bg-surface':     '#162235',
        'bg-hover':       '#1E2D45',
        'text-primary':   '#EAF0FF',
        'text-secondary': '#9AA8C7',
        'text-muted':     '#64748B',
        'primary':        '#7C3AED',
        'primary-end':    '#A855F7',
        'accent':         '#F59E0B',
        'accent-end':     '#FB923C',
        'success':        '#10B981',
        'error':          '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #7C3AED, #A855F7)',
        'gradient-accent':  'linear-gradient(135deg, #F59E0B, #FB923C)',
      },
    }
  },
  plugins: [],
}
