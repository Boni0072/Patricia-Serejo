/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F1F4F9',
          100: '#E3E8F1',
          200: '#C2CCDE',
          300: '#8A9DBE',
          400: '#4A6494',
          500: '#2A4270',
          600: '#1B3055',
          700: '#0F1F3D',
          800: '#0A1730',
          900: '#07101F',
          950: '#050B16',
        },
        gold: {
          50: '#FBF8F1',
          100: '#F4EEE0',
          200: '#E8DBBE',
          300: '#D9C494',
          400: '#C7AD74',
          500: '#B8975A',
          600: '#A17F49',
          700: '#87663A',
          800: '#6B502E',
          900: '#543F25',
        },
        ink: {
          50: '#F7F7F6',
          100: '#EDEEEF',
          200: '#D9DBDE',
          300: '#B4B7BC',
          400: '#7B7F87',
          500: '#565A62',
          600: '#2B2F36',
          700: '#24272C',
          800: '#1C1F23',
          900: '#15171A',
          950: '#0E0F11',
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
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Lato', 'Montserrat', 'sans-serif'],
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
