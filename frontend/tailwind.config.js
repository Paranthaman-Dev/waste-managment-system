/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Better CSSP: use CSS variables from @theme, keep JS config minimal — only what CSS can't express
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      // Colors now in @theme --color-* (styles.css) for Tailwind v4 CSS-first; keep semantic aliases for JS usage
      colors: {
        // Fallback for JS (e.g., MiniAreaChart) — CSS @theme is source of truth for utilities
        primary: '#2563EB',
        background: '#F8FAFC',
        foreground: '#1E293B',
        card: '#FFFFFF',
        border: '#E2E8F0',
        ring: '#2563EB',
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
        emerald: { 50: '#ECFDF5', 100: '#D1FAE5', 500: '#10B981', 600: '#059669', 700: '#047857' },
        amber: { 50: '#FFFBEB', 100: '#FEF3C7', 500: '#F59E0B', 600: '#D97706' },
        violet: { 50: '#F5F3FF', 100: '#EDE9FE', 500: '#8B5CF6', 600: '#7C3AED' },
        blue: { 50: '#EFF6FF', 100: '#DBEAFE', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8' },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Plus Jakarta Sans', 'sans-serif'],
      },
      borderRadius: {
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-3xl)',
        '4xl': 'var(--radius-4xl)',
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        card: 'var(--shadow-card)',
        'card-hover': '0 8px 24px rgba(15,23,42,0.08), 0 16px 48px rgba(15,23,42,0.10)',
        glass: 'var(--shadow-glass)',
        focus: '0 0 0 4px color-mix(in srgb, var(--ring) 12%, transparent)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { '0%': { opacity: '0', transform: 'scale(0.96)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        shimmer: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'scale-in': 'scale-in 0.25s ease-out',
        shimmer: 'shimmer 1.6s ease-in-out infinite',
      },
      screens: { xs: '375px', sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1440px' },
      // Container queries — modern responsive without JS
      containers: { card: '380px' },
    },
  },
  plugins: [],
};
