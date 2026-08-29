/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        // New identity — warm sustainable, not blue glass
        background: '#FDFCF9',
        surface: '#FFFFFF',
        'surface-elevated': '#FFFFFF',
        foreground: '#1A2E14',
        muted: '#F5F3EF',
        'muted-foreground': '#6B7C6E',
        border: '#E8E6E1',
        'border-strong': '#D4D0CA',
        input: '#E8E6E1',
        ring: '#3A5A40',
        primary: {
          DEFAULT: '#3A5A40',
          foreground: '#FFFFFF',
          hover: '#2D4A34',
          muted: '#E8F0E6',
        },
        secondary: {
          DEFAULT: '#D4A574',
          foreground: '#1A2E14',
        },
        accent: {
          DEFAULT: '#C2704A',
          foreground: '#FFFFFF',
          muted: '#FDF0E8',
        },
        success: {
          DEFAULT: '#3A5A40',
          muted: '#E8F0E6',
          foreground: '#1A2E14',
        },
        warning: {
          DEFAULT: '#B45309',
          muted: '#FEF3C7',
        },
        error: {
          DEFAULT: '#C23030',
          muted: '#FEE2E2',
        },
        info: {
          DEFAULT: '#2563EB',
          muted: '#EFF6FF',
        },
        // Extended neutrals — warm stone, not slate blue
        stone: {
          50: '#FDFCF9',
          100: '#F5F3EF',
          200: '#E8E6E1',
          300: '#D4D0CA',
          400: '#A8A29E',
          500: '#78716C',
          600: '#57534E',
          700: '#44403C',
          800: '#292524',
          900: '#1C1917',
        },
        sage: {
          50: '#F4F7F4',
          100: '#E8F0E6',
          200: '#C5D9C1',
          500: '#6B8F71',
          600: '#4A6741',
          700: '#3A5A40',
          800: '#2D4A34',
          900: '#1A2E14',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        hero: ['3.25rem', { lineHeight: '0.95', letterSpacing: '-0.03em', fontWeight: '700' }],
        display: ['2rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        title: ['0.9375rem', { lineHeight: '1.4', fontWeight: '650' }],
        label: ['0.6875rem', { lineHeight: '1.2', letterSpacing: '0.08em', fontWeight: '600' }],
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
      },
      boxShadow: {
        soft: '0 1px 3px rgba(26,46,20,0.04), 0 4px 16px rgba(26,46,20,0.06)',
        card: '0 2px 8px rgba(26,46,20,0.04), 0 12px 24px rgba(26,46,20,0.06)',
        'card-hover': '0 4px 12px rgba(26,46,20,0.06), 0 16px 32px rgba(26,46,20,0.08)',
        focus: '0 0 0 4px rgba(58,90,64,0.12)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0', y: '6px' }, '100%': { opacity: '1', y: '0' } },
        'scale-in': { '0%': { opacity: '0', scale: '0.98' }, '100%': { opacity: '1', scale: '1' } },
        shimmer: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.32s ease-out',
        'scale-in': 'scale-in 0.22s ease-out',
        shimmer: 'shimmer 1.5s ease-in-out infinite',
      },
      screens: {
        xs: '375px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1440px',
      },
    },
  },
  plugins: [],
};
