/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F5EDE3',
          100: '#FAF6F2',
          200: '#EDE0D2',
          300: '#E2D3C5',
          400: '#C98A98',
          500: '#B7435A',
          600: '#8E1E3F',
          700: '#5B0D22',
          800: '#410817',
          900: '#35131E',
          950: '#1F0A12',
        },
        gold: {
          50: '#FAF6F2',
          100: '#F5EDE3',
          200: '#E4C98F',
          300: '#D4B06A',
          400: '#C8A15A',
          500: '#B9914C',
          600: '#A57A3A',
          700: '#7E5F2D',
          800: '#5F4726',
          900: '#48361E',
        },
        ink: {
          50: '#FAF6F2',
          100: '#F5EDE3',
          200: '#E2D3C5',
          300: '#C98A98',
          400: '#8E1E3F',
          500: '#6F5A5F',
          600: '#5B0D22',
          700: '#410817',
          800: '#35131E',
          900: '#1F0A12',
          950: '#14070C',
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
