/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Elegant SaaS – Trust Blue + Glass + Slate
        primary: '#2563EB',
        'on-primary': '#FFFFFF',
        secondary: '#3B82F6',
        'on-secondary': '#0F172A',
        accent: '#EA580C',
        'on-accent': '#FFFFFF',
        background: '#F8FAFC',
        foreground: '#1E293B',
        card: '#FFFFFF',
        'card-foreground': '#1E293B',
        muted: '#E9EFF8',
        'muted-foreground': '#475569',
        border: '#E2E8F0',
        destructive: '#DC2626',
        'on-destructive': '#FFFFFF',
        ring: '#2563EB',
        // Extended – keep waste-eco semantic
        ink: '#0F172A',
        paper: '#F8FAFC',
        slate: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        teal: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          600: '#0D9488',
          700: '#0F766E',
        },
        emerald: {
          50: '#ECFDF5',
          500: '#10B981',
          600: '#059669',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'sans-serif'],
      },
      fontSize: {
        hero: ['52px', { lineHeight: '1.05', letterSpacing: '-0.03em', fontWeight: '700' }],
        display: ['36px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.06)',
        card: '0 4px 6px -1px rgba(15,23,42,0.05), 0 12px 32px rgba(15,23,42,0.08)',
        'card-hover': '0 8px 24px rgba(15,23,42,0.08), 0 16px 48px rgba(15,23,42,0.10)',
        glass: '0 8px 32px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
        focus: '0 0 0 3px rgba(37,99,235,0.15)',
      },
      borderRadius: {
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
      backdropBlur: {
        glass: '16px',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
