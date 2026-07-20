/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f7f6f3',
          100: '#ece8e0',
          200: '#d9cfbd',
          300: '#c0b094',
          400: '#a08e6c',
          500: '#806f51',
          600: '#635640',
          700: '#4f4436',
          800: '#3f372d',
          900: '#2b261f',
          950: '#1a1611',
        },
        gold: {
          50: '#fbf8ef',
          100: '#f5ecd0',
          200: '#ebd79c',
          300: '#e0bd63',
          400: '#d6a73c',
          500: '#c98e28',
          600: '#a86e21',
          700: '#855020',
          800: '#6f4022',
          900: '#5d3621',
        },
        ink: {
          50: '#f6f7f8',
          100: '#ebedf0',
          200: '#d3d8df',
          300: '#aab3bf',
          400: '#7c8898',
          500: '#5d6a7d',
          600: '#495466',
          700: '#3c4554',
          800: '#333a47',
          900: '#1e232d',
          950: '#13171f',
        },
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.4s ease-out forwards',
        'scale-in': 'scale-in 0.3s ease-out forwards',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
