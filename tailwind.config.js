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
          DEFAULT: '#ff5e8a',
          50: '#fff1f4',
          100: '#ffe4ea',
          200: '#ffced8',
          300: '#ffa6b8',
          400: '#ff7593',
          500: '#ff5e8a',
          600: '#ed1f5c',
          700: '#c91148',
          800: '#a71141',
          900: '#8e123d'
        },
        secondary: {
          DEFAULT: '#a78bfa',
          500: '#a78bfa',
          700: '#7c3aed'
        },
        cream: '#fff7f5',
        love: {
          dark: '#1a1218',
          card: '#ffffff',
          'card-dark': '#241b22'
        },
        income: '#34d399',
        expense: '#ff4d6d',
        warning: '#ffb703'
      },
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      animation: {
        blob: 'blob 8s infinite ease-in-out',
        'blob-slow': 'blob 12s infinite ease-in-out',
        float: 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
        shimmer: 'shimmer 2.5s infinite',
        confetti: 'confetti 1s ease-out forwards'
      },
      keyframes: {
        blob: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(30px, -50px) scale(1.1)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.9)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' }
        },
        'pulse-soft': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.08)', opacity: '0.85' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' }
        },
        confetti: {
          '0%': { transform: 'translateY(0) rotate(0)', opacity: '1' },
          '100%': { transform: 'translateY(120vh) rotate(720deg)', opacity: '0' }
        }
      },
      boxShadow: {
        soft: '0 10px 40px -10px rgba(255, 94, 138, 0.18)',
        glow: '0 0 24px rgba(255, 94, 138, 0.35)',
        'glow-secondary': '0 0 24px rgba(167, 139, 250, 0.35)'
      }
    }
  },
  plugins: []
}
