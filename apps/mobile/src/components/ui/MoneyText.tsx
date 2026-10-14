import { type CurrencyCode, DEFAULT_CURRENCY, formatAmount } from '@meledger/shared';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { lightColors, spacing } from '@/theme/tokens';

interface MoneyTextProps {
  minor: number;
  currency?: CurrencyCode;
  variant?: ComponentProps<typeof Text>['variant'];
}

/** Amount in onSurface with a smaller, grey currency code before it (e.g. "UGX 87,457"). */
export function MoneyText({
  minor,
  currency = DEFAULT_CURRENCY,
  variant = 'displaySmall',
}: MoneyTextProps) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${currency} ${formatAmount(minor, currency)}`}
    >
      <Text variant="titleMedium" style={styles.code}>
        {currency}
      </Text>
      <Text variant={variant}>{formatAmount(minor, currency)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  code: { color: lightColors.onSurfaceVariant },
});
