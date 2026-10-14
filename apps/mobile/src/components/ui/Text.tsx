import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { MONEY_VARIANTS, typography, type TypographyVariant } from '@/theme/typography';
import { lightColors } from '@/theme/tokens';

const TONES = {
  default: lightColors.onSurface,
  muted: lightColors.onSurfaceVariant,
  primary: lightColors.primary,
  income: lightColors.positive,
  expense: lightColors.expense,
  inverse: '#FFFFFF',
} as const;

export type TextTone = keyof typeof TONES;

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  tone?: TextTone;
  /** Overrides tone. */
  color?: string;
  align?: 'left' | 'center' | 'right';
}

/** App text: a typography variant plus a colour tone. Money variants get tabular figures. */
export function Text({
  variant = 'body',
  tone = 'default',
  color,
  align,
  style,
  ...rest
}: TextProps) {
  return (
    <RNText
      {...rest}
      style={[
        typography[variant],
        { color: color ?? TONES[tone] },
        MONEY_VARIANTS.has(variant) && styles.tabular,
        align && { textAlign: align },
        style,
      ]}
    />
  );
}

const styles = { tabular: { fontVariant: ['tabular-nums' as const] } };
