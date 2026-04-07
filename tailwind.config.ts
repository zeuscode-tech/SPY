import type { Config } from 'tailwindcss';

// ─────────────────────────────────────────────────────────────────────────────
// Tailwind Config – "Cyberpunk" Premium Theme
// Palette: Neon Blue · Deep Purple · Acid Green · True Black (OLED)
// ─────────────────────────────────────────────────────────────────────────────

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './data/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // ── Brand Colours ──────────────────────────────────────────────────────
      colors: {
        // Primary palette
        'neon-blue':    '#00D4FF',
        'neon-blue-dim':'#0096B4',
        'deep-purple':  '#6B00FF',
        'purple-glow':  '#9D4EDD',
        'acid-green':   '#39FF14',
        'acid-dim':     '#27B30E',
        'cyber-pink':   '#FF006E',
        'hot-yellow':   '#FFD600',

        // Surface / glass
        'glass-white':  'rgba(255,255,255,0.06)',
        'glass-border': 'rgba(255,255,255,0.12)',
        'glass-heavy':  'rgba(255,255,255,0.10)',

        // Greyscale
        'zinc-900':     '#111113',
        'zinc-950':     '#09090B',
      },

      // ── Typography ─────────────────────────────────────────────────────────
      fontFamily: {
        mono:  ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        cyber: ['"Orbitron"', 'sans-serif'],
      },

      // ── Background Gradients ───────────────────────────────────────────────
      backgroundImage: {
        'cyber-gradient':
          'linear-gradient(135deg, #000000 0%, #0D0D1A 50%, #050510 100%)',
        'neon-glow-blue':
          'radial-gradient(circle, rgba(0,212,255,0.15) 0%, transparent 70%)',
        'neon-glow-purple':
          'radial-gradient(circle, rgba(107,0,255,0.15) 0%, transparent 70%)',
        'neon-glow-green':
          'radial-gradient(circle, rgba(57,255,20,0.15) 0%, transparent 70%)',
        'glass-card':
          'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
        'spy-button':
          'linear-gradient(135deg, #6B00FF 0%, #00D4FF 100%)',
        'danger-button':
          'linear-gradient(135deg, #FF006E 0%, #FF4500 100%)',
        'success-button':
          'linear-gradient(135deg, #39FF14 0%, #00D4FF 100%)',
      },

      // ── Box Shadows (Neon Glow Effects) ────────────────────────────────────
      boxShadow: {
        'neon-blue':   '0 0 20px rgba(0,212,255,0.5), 0 0 40px rgba(0,212,255,0.2)',
        'neon-purple': '0 0 20px rgba(107,0,255,0.5), 0 0 40px rgba(107,0,255,0.2)',
        'neon-green':  '0 0 20px rgba(57,255,20,0.5),  0 0 40px rgba(57,255,20,0.2)',
        'neon-pink':   '0 0 20px rgba(255,0,110,0.5),  0 0 40px rgba(255,0,110,0.2)',
        'glass':       '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
        'card-hover':  '0 16px 48px rgba(0,0,0,0.6), 0 0 30px rgba(0,212,255,0.1)',
        'inner-glow':  'inset 0 0 30px rgba(0,212,255,0.05)',
      },

      // ── Animations ─────────────────────────────────────────────────────────
      keyframes: {
        'pulse-neon': {
          '0%, 100%': { opacity: '1', filter: 'brightness(1)' },
          '50%':      { opacity: '0.7', filter: 'brightness(1.4)' },
        },
        'scanline': {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'glitch': {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 1px)' },
          '40%': { transform: 'translate(2px, -1px)' },
          '60%': { transform: 'translate(-1px, 2px)' },
          '80%': { transform: 'translate(1px, -2px)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        'border-pulse': {
          '0%, 100%': { borderColor: 'rgba(0,212,255,0.3)' },
          '50%':      { borderColor: 'rgba(0,212,255,0.8)' },
        },
        'reveal': {
          '0%':   { filter: 'blur(20px)', opacity: '0', transform: 'scale(0.9)' },
          '100%': { filter: 'blur(0px)',  opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'pulse-neon':    'pulse-neon 2s ease-in-out infinite',
        'scanline':      'scanline 4s linear infinite',
        'glitch':        'glitch 0.3s ease-in-out',
        'float':         'float 3s ease-in-out infinite',
        'border-pulse':  'border-pulse 2s ease-in-out infinite',
        'reveal':        'reveal 0.4s ease-out forwards',
      },

      // ── Backdrop Blur ──────────────────────────────────────────────────────
      backdropBlur: {
        xs: '2px',
        cyber: '20px',
      },

      // ── Border Radius ──────────────────────────────────────────────────────
      borderRadius: {
        cyber: '2px',
        glass: '16px',
      },

      // ── Screen Sizes for S23 Ultra ─────────────────────────────────────────
      screens: {
        'xs':  '390px',
        'sm':  '430px',
        'md':  '768px',
      },

      // ── Spacing ────────────────────────────────────────────────────────────
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '88': '22rem',
        '92': '23rem',
        '96': '24rem',
      },
    },
  },
  plugins: [],
};

export default config;
