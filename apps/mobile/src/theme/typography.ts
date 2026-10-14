import type { TextStyle } from 'react-native';

import { fontFamily } from './fonts';

const style = (
  family: string,
  fontSize: number,
  lineHeight: number,
  letterSpacing = 0,
): TextStyle => ({ fontFamily: family, fontSize, lineHeight, letterSpacing });

/**
 * Plus Jakarta Sans type scale. Big numbers use tight tracking; money variants use tabular
 * figures so columns of amounts line up.
 */
export const typography = {
  /** Home balance. */
  display: style(fontFamily.extrabold, 40, 48, -1.2),
  /** Amount field on the entry form. */
  amountXL: style(fontFamily.bold, 44, 52, -1),
  /** Card amounts (Your Money). */
  amount: style(fontFamily.bold, 22, 28, -0.4),
  /** Screen titles. */
  headline: style(fontFamily.bold, 26, 32, -0.6),
  /** Section titles and sheet titles. */
  title: style(fontFamily.bold, 19, 24, -0.3),
  /** Row and card titles. */
  subtitle: style(fontFamily.semibold, 16, 22, -0.1),
  body: style(fontFamily.regular, 15, 22),
  bodyStrong: style(fontFamily.semibold, 15, 22),
  button: style(fontFamily.bold, 16, 20, -0.1),
  label: style(fontFamily.semibold, 14, 18),
  caption: style(fontFamily.medium, 13, 18),
  small: style(fontFamily.medium, 12, 16),
  /** Tab bar labels and badges. */
  micro: style(fontFamily.semibold, 11, 14, 0.1),
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

/** Variants that render money get tabular figures. */
export const MONEY_VARIANTS: ReadonlySet<TypographyVariant> = new Set([
  'display',
  'amountXL',
  'amount',
]);
