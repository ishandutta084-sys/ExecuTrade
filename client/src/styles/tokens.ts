/**
 * ExecuTrade Design Tokens
 * Direction: "Trading Desk Ticket Tape"
 * Calm, precise, dense, typographic. Built on hairline rules and strict geometry.
 */

export const tokens = {
  colors: {
    dark: {
      canvas: '#121110', // Warm graphite
      surface: '#181716', // Primary surface tone
      raised: '#1F1D1B',  // Elevated / hover / selected tone
      borderHairline: 'rgba(255, 244, 230, 0.08)',
      borderStrong: 'rgba(255, 244, 230, 0.16)',
      textPrimary: '#EDE8E0',
      textSecondary: '#A39D93',
      textTertiary: '#6F6A62',
      accentBrass: '#C9A24B', // Focus rings, active nav, primary actions
      accentBrassHover: '#B8923C',
      buy: '#6FB58A', // Muted sage green (BUY / profit)
      sell: '#D0645A', // Muted brick red (SELL / loss / destructive)
      pending: '#D9A441', // Amber warning / in-flight
    },
    light: {
      canvas: '#F4F0E8', // Ledger paper background
      surface: '#FBF9F4', // Paper surface
      raised: '#EDE7DC',  // Warm paper highlight
      borderHairline: 'rgba(27, 26, 24, 0.08)',
      borderStrong: 'rgba(27, 26, 24, 0.16)',
      textPrimary: '#1B1A18',
      textSecondary: '#6B655B',
      textTertiary: '#948E84',
      accentBrass: '#A67D24',
      accentBrassHover: '#8E6819',
      buy: '#3B7E55',
      sell: '#A83B32',
      pending: '#A8761E',
    }
  },
  typography: {
    fontSans: '"Geist", "Inter Tight", system-ui, -apple-system, sans-serif',
    fontMono: '"Geist Mono", "JetBrains Mono", ui-monospace, monospace',
    scale: {
      tiny: '11px',
      xs: '12px',
      sm: '13px',
      base: '15px',
      lg: '20px',
      xl: '32px',
      hero: '48px',
    },
  },
  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    6: '24px',
    8: '32px',
  },
  radii: {
    control: '4px',
    panel: '6px',
  },
  motion: {
    durationFast: '120ms',
    durationBase: '180ms',
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
  }
} as const;

export type DesignTokens = typeof tokens;
