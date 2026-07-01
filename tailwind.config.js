/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm graphite surfaces — premium near-black, layered
        base: {
          DEFAULT: '#0a0a0c',
          950: '#08080a',
          900: '#0d0d10',
          850: '#121215',
          800: '#17171c',
          750: '#1e1e24',
          700: '#26262e',
          600: '#33333d',
        },
        line: 'rgba(196,184,158,0.10)',
        line2: 'rgba(196,184,158,0.18)',
        // Champagne-gold accent — the "costly" signal, used sparingly
        brand: {
          50: '#fbf3df',
          200: '#f1dca9',
          300: '#e6c87f',
          400: '#d6b15f',
          500: '#c2974a',
          600: '#a37c39',
        },
        // Warm off-white text
        paper: {
          DEFAULT: '#ece8e1',
          muted: '#b7b2a8',
          dim: '#86827a',
        },
        // Severity spectrum (data color)
        sev: {
          critical: '#ff5470',
          high: '#ff9447',
          medium: '#f2c14e',
          low: '#5bb8ff',
          none: '#8a8a96',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 12px 44px -20px rgba(0,0,0,0.85)',
        glow: '0 0 0 1px rgba(214,177,95,0.30), 0 0 34px -8px rgba(214,177,95,0.4)',
        pop: '0 28px 70px -28px rgba(0,0,0,0.9)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        sweep: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(200%)' } },
      },
      animation: {
        'fade-up': 'fade-up 0.3s ease-out both',
        'fade-in': 'fade-in 0.25s ease-out both',
        sweep: 'sweep 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
