import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './data/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── New coral palette ──────────────────────────────────────────────
        'coral':        '#FF7E5F',
        'coral-end':    '#FEB47B',
        'coral-accent': '#FF8C73',
        'void':         '#0C0C10',

        // ── Legacy names remapped to coral for backward compat ─────────────
        'neon-blue':    '#FF8C73',
        'neon-blue-dim':'#E07A60',
        'deep-purple':  '#4338CA',
        'purple-glow':  '#7C3AED',
        'acid-green':   '#FF7E5F',
        'acid-dim':     '#E06A50',
        'cyber-pink':   '#FEB47B',
        'hot-yellow':   '#FFD600',

        // ── Surface / glass ────────────────────────────────────────────────
        'glass-white':  'rgba(255,255,255,0.06)',
        'glass-border': 'rgba(255,255,255,0.08)',
        'glass-heavy':  'rgba(255,255,255,0.10)',

        // ── Greyscale ──────────────────────────────────────────────────────
        'zinc-900':     '#111113',
        'zinc-950':     '#09090B',
      },

      fontFamily: {
        mono:    ['system-ui', 'sans-serif'],
        sans:    ['system-ui', 'sans-serif'],
        cyber:   ['system-ui', 'sans-serif'],
        display: ['system-ui', 'sans-serif'],
      },

      backgroundImage: {
        'void-gradient':
          'linear-gradient(135deg, #0C0C10 0%, #0F0D1A 50%, #0C0C10 100%)',
        'coral-gradient':
          'linear-gradient(135deg, #FF7E5F 0%, #FEB47B 100%)',
        'glass-card':
          'linear-gradient(135deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 100%)',
        'neon-glow-blue':
          'radial-gradient(circle, rgba(255,140,115,0.12) 0%, transparent 70%)',
        'neon-glow-purple':
          'radial-gradient(circle, rgba(67,56,202,0.15) 0%, transparent 70%)',
        'neon-glow-green':
          'radial-gradient(circle, rgba(255,126,95,0.12) 0%, transparent 70%)',
        'spy-button':
          'linear-gradient(135deg, #FF7E5F 0%, #FEB47B 100%)',
        'danger-button':
          'linear-gradient(135deg, #FF3B30 0%, #FF6B6B 100%)',
        'success-button':
          'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      },

      boxShadow: {
        'neon-blue':   '0 0 20px rgba(255,140,115,0.35), 0 0 40px rgba(255,140,115,0.12)',
        'neon-purple': '0 0 20px rgba(67,56,202,0.4),   0 0 40px rgba(67,56,202,0.15)',
        'neon-green':  '0 0 20px rgba(255,126,95,0.35),  0 0 40px rgba(255,126,95,0.12)',
        'neon-pink':   '0 0 20px rgba(254,180,123,0.35), 0 0 40px rgba(254,180,123,0.12)',
        'coral':       '0 0 20px rgba(255,126,95,0.4),   0 0 40px rgba(254,180,123,0.15)',
        'glass':       '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
        'card-hover':  '0 16px 48px rgba(0,0,0,0.6), 0 0 30px rgba(255,126,95,0.08)',
        'inner-glow':  'inset 0 0 30px rgba(255,126,95,0.05)',
      },

      keyframes: {
        'pulse-neon': {
          '0%, 100%': { opacity: '1',   filter: 'brightness(1)' },
          '50%':      { opacity: '0.7', filter: 'brightness(1.4)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        'reveal': {
          '0%':   { filter: 'blur(20px)', opacity: '0', transform: 'scale(0.9)' },
          '100%': { filter: 'blur(0px)',  opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
        'float':      'float 3s ease-in-out infinite',
        'reveal':     'reveal 0.4s ease-out forwards',
      },

      backdropBlur: {
        xs:     '2px',
        cyber:  '20px',
        glass:  '14px',
      },

      borderRadius: {
        cyber: '2px',
        glass: '20px',
        pill:  '9999px',
      },

      screens: {
        xs: '390px',
        sm: '430px',
        md: '768px',
      },

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
