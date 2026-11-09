/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-canvas)',
        surface: 'var(--bg-surface)',
        raised: 'var(--bg-raised)',
        hairline: 'var(--border-hairline)',
        borderStrong: 'var(--border-strong)',
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        tertiary: 'var(--text-tertiary)',
        brass: 'var(--brand-brass)',
        brassHover: 'var(--brand-brass-hover)',
        buy: 'var(--status-buy)',
        sell: 'var(--status-sell)',
        pending: 'var(--status-pending)',
      },
      fontFamily: {
        sans: ['Geist', 'Inter Tight', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Geist Mono"', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        tiny: ['11px', { lineHeight: '14px' }],
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['13px', { lineHeight: '18px' }],
        base: ['15px', { lineHeight: '22px' }],
        lg: ['20px', { lineHeight: '26px' }],
        xl: ['32px', { lineHeight: '38px' }],
        hero: ['48px', { lineHeight: '52px' }],
      },
      borderRadius: {
        control: '4px',
        panel: '6px',
        sm: '4px',
        md: '6px',
        DEFAULT: '4px',
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        6: '24px',
        8: '32px',
      },
      transitionDuration: {
        fast: '120ms',
        base: '180ms',
      },
      boxShadow: {
        none: 'none',
      }
    },
  },
  plugins: [],
}
