/** Design tokens from docs/BUILD_PROMPT.md section 4. */
export const palette = {
  lime: '#65A30D',
  blue: '#2E9BF0',
  green: '#22C55E',
  orange: '#F97316',
  pink: '#EC4899',
  teal: '#14B8A6',
  amber: '#F59E0B',
  slate: '#64748B',
} as const;

export const categoryColors = Object.values(palette);

/** Resolves a stored palette key ("lime") to its hex value; hex values pass through. */
export const paletteColor = (keyOrHex: string): string =>
  keyOrHex.startsWith('#')
    ? keyOrHex
    : (palette[keyOrHex as keyof typeof palette] ?? palette.slate);

export interface ColorTokens {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  headerGradient: readonly [string, string];
  background: string;
  surface: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  income: string;
  incomeContainer: string;
  expense: string;
  expenseContainer: string;
  positive: string;
  positiveContainer: string;
  warning: string;
  onWarning: string;
  insightBar: string;
}

export const lightColors: ColorTokens = {
  primary: '#0067EE',
  onPrimary: '#FFFFFF',
  primaryContainer: '#E4F0FF',
  onPrimaryContainer: '#003A8C',
  headerGradient: ['#2684FC', '#0067EE'],
  background: '#F4F4F5',
  surface: '#FFFFFF',
  onSurface: '#111111',
  onSurfaceVariant: '#71717A',
  outline: '#E4E4E7',
  income: '#2E9BF0',
  incomeContainer: '#E6F3FE',
  expense: '#EF4444',
  expenseContainer: '#FDECEC',
  positive: '#16A34A',
  positiveContainer: '#E7F6EC',
  warning: '#F97316',
  onWarning: '#FFFFFF',
  insightBar: '#111111',
};

/** Same roles for the dark theme. Not switched on until milestone 8. */
export const darkColors: ColorTokens = {
  primary: '#5A9BFF',
  onPrimary: '#001A40',
  primaryContainer: '#0B2E5C',
  onPrimaryContainer: '#E4F0FF',
  headerGradient: ['#1E64D0', '#0A3F8F'],
  background: '#0B0B0D',
  surface: '#18181B',
  onSurface: '#F4F4F5',
  onSurfaceVariant: '#A1A1AA',
  outline: '#27272A',
  income: '#5AB2F5',
  incomeContainer: '#0F2A40',
  expense: '#F87171',
  expenseContainer: '#3F1515',
  positive: '#4ADE80',
  positiveContainer: '#12301D',
  warning: '#FB923C',
  onWarning: '#1C0A00',
  insightBar: '#000000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  /** Screen side padding. */
  gutter: 20,
  /** Space between sections on a screen. */
  section: 28,
} as const;

export const radius = {
  /** Chips inside cards, small tiles. */
  small: 12,
  /** Icon tiles. */
  tile: 14,
  /** Inputs and field cards. */
  field: 18,
  /** Cards and list groups. */
  card: 24,
  /** Bottom sheets and popovers. */
  sheet: 28,
  pill: 999,
} as const;

/** Soft shadows (no borders anywhere): cards barely lift, floating things lift more. */
export const shadow = {
  card: '0 1px 2px rgba(17,17,17,0.04), 0 4px 16px rgba(17,17,17,0.04)',
  raised: '0 8px 24px rgba(17,17,17,0.10)',
  floating: '0 12px 32px rgba(17,17,17,0.16)',
} as const;

/** Motion: short UI transitions and the springs used for press and sheet feedback. */
export const motion = {
  fast: 150,
  base: 220,
  slow: 360,
  /** Press feedback (scale down and back). */
  press: { damping: 18, stiffness: 320, mass: 0.6 },
  /** Popovers and toasts settling in. */
  pop: { damping: 20, stiffness: 260, mass: 0.8 },
} as const;

/** Tinted tile background: the colour at about 10% opacity. */
export const tint = (hex: string, alpha = 0.1) =>
  `${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')}`;
