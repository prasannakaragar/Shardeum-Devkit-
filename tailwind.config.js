/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        shardeum: {
          50: '#f0fdf9',
          100: '#ccfbef',
          200: '#99f5e0',
          300: '#5aeacc',
          400: '#1ed4b0',
          500: '#06b897',
          600: '#03947a',
          700: '#057663',
          800: '#095e50',
          900: '#0a4d43',
          950: '#03302b',
        },
        cyber: {
          bg: '#030d12',
          card: '#061520',
          border: '#0d2d3d',
          accent: '#00f5d4',
          glow: '#00c4aa',
          warn: '#f59e0b',
          error: '#ef4444',
          success: '#10b981',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Orbitron', 'sans-serif'],
        body: ['Rajdhani', 'sans-serif'],
      },
      animation: {
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'scan-line': 'scanLine 3s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'data-flow': 'dataFlow 1.5s ease-in-out infinite',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 5px #00f5d4, 0 0 10px #00f5d4' },
          '50%': { boxShadow: '0 0 20px #00f5d4, 0 0 40px #00f5d4, 0 0 60px #00f5d4' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        dataFlow: {
          '0%': { opacity: 0, transform: 'translateX(-10px)' },
          '50%': { opacity: 1 },
          '100%': { opacity: 0, transform: 'translateX(10px)' },
        }
      }
    }
  },
  plugins: []
}
