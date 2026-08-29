/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Luxury Cybercore – Y2K Chrome + Midnight OLED
        ink: '#0A0E27',
        paper: '#F0FDFA',
        midnight: '#0A0E27',
        void: '#020208',
        teal: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          300: '#5EEAD4',
          400: '#2DD4BF',
          600: '#0D9488',
          800: '#134E4A',
          900: '#0F2F2B',
        },
        neon: {
          cyan: '#00FFFF',
          pink: '#FF69B4',
          amber: '#D97706',
          purple: '#9400D3',
          green: '#00FF88',
        },
        chrome: {
          100: '#F5F7FA',
          300: '#C0C0C0',
          500: '#9CA3AF',
          900: '#1F2937',
        },
        skin: {
          paper: '#FAFAFA',
          grid: '#E8F1F4',
          sketch: '#134E4A',
        },
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
        y2k: ['Space Grotesk', 'Inter', 'sans-serif'],
      },
      fontSize: {
        'hero': ['72px', { lineHeight: '0.9', letterSpacing: '-0.04em', fontWeight: '800' }],
        'display': ['56px', { lineHeight: '0.95', letterSpacing: '-0.03em', fontWeight: '800' }],
      },
      boxShadow: {
        'chrome': 'inset 0 1px 0 rgba(255,255,255,0.8), 0 8px 32px rgba(0,0,0,0.12)',
        'neon-cyan': '0 0 20px rgba(0,255,255,0.35), 0 0 40px rgba(0,255,255,0.15)',
        'neon-pink': '0 0 20px rgba(255,105,180,0.35), 0 0 40px rgba(255,105,180,0.15)',
        'hud': '0 0 0 1px rgba(0,255,255,0.15), 0 8px 32px rgba(0,0,0,0.4)',
      },
      borderRadius: {
        'hud': '16px',
        'chrome': '20px',
      },
      backgroundImage: {
        'chrome': 'linear-gradient(180deg, #FFFFFF 0%, #E8EEF2 48%, #C0C0C0 100%)',
        'chrome-hover': 'linear-gradient(180deg, #FFFFFF 0%, #DDE6ED 48%, #B8C0C8 100%)',
        'midnight': 'radial-gradient(1200px 600px at 20% -10%, rgba(0,255,255,0.08) 0%, transparent 60%), radial-gradient(800px 400px at 90% 0%, rgba(255,105,180,0.06) 0%, transparent 60%), linear-gradient(180deg, #0A0E27 0%, #020208 100%)',
        'grid': 'linear-gradient(rgba(19,78,74,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(19,78,74,0.06) 1px, transparent 1px)',
        'scanline': 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.03) 2px, rgba(0,255,255,0.03) 4px)',
      },
      keyframes: {
        glow: {
          '0%, 100%': { opacity: '0.8', filter: 'brightness(1)' },
          '50%': { opacity: '1', filter: 'brightness(1.15)' },
        },
        glitch: {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-1px, 1px)' },
          '40%': { transform: 'translate(1px, -1px)' },
          '60%': { transform: 'translate(-1px, 0)' },
          '80%': { transform: 'translate(1px, 0)' },
          '100%': { transform: 'translate(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        glow: 'glow 3s ease-in-out infinite',
        glitch: 'glitch 0.3s ease-in-out',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [],
};
