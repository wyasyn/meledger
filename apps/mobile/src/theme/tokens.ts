/** Design tokens from docs/BUILD_PROMPT.md section 4. */
export const palette = {
  violet: '#8B5CF6',
  blue: '#2E9BF0',
  green: '#22C55E',
  orange: '#F97316',
  pink: '#EC4899',
  teal: '#14B8A6',
  amber: '#F59E0B',
  slate: '#64748B',
} as const;

export const categoryColors = Object.values(palette);

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
  primary: '#8B5CF6',
  onPrimary: '#FFFFFF',
  primaryContainer: '#EDE7FE',
  onPrimaryContainer: '#4C1D95',
  headerGradient: ['#A78BFA', '#8B5CF6'],
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
  primary: '#A78BFA',
  onPrimary: '#1E1035',
  primaryContainer: '#3B2A63',
  onPrimaryContainer: '#EDE7FE',
  headerGradient: ['#7C3AED', '#5B21B6'],
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

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;

export const radius = { card: 20, small: 12, pill: 999 } as const;

/** Tinted tile background: the colour at about 10% opacity. */
export const tint = (hex: string, alpha = 0.1) =>
  `${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')}`;
