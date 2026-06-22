/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './electron/**/*.{js,ts}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#e0526c',
          50: '#fff1f3',
          100: '#ffe4e8',
          200: '#ffccd5',
          300: '#ff9eb0',
          400: '#f96b84',
          500: '#e0526c',
          600: '#c93652',
          700: '#a82740',
          800: '#8b2339',
          900: '#762235'
        },
        secondary: {
          DEFAULT: '#6366f1',
          500: '#6366f1',
          700: '#4338ca'
        },
        cream: '#fffafa',
        love: {
          dark: '#18151a',
          card: '#ffffff',
          'card-dark': '#201c23'
        },
        income: '#10b981',
        expense: '#ef4444',
        warning: '#f59e0b'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      animation: {
        blob: 'blob 12s infinite ease-in-out',
        'blob-slow': 'blob 18s infinite ease-in-out',
        float: 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 4s ease-in-out infinite'
      },
      keyframes: {
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(20px, -30px) scale(1.05)' },
          '66%': { transform: 'translate(-15px, 15px) scale(0.95)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' }
        },
        'pulse-soft': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.04)', opacity: '0.9' }
        }
      },
      boxShadow: {
        soft: '0 8px 30px -8px rgba(0, 0, 0, 0.08)',
        glow: '0 0 20px rgba(224, 82, 108, 0.2)'
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem'
      }
    }
  },
  plugins: []
}
