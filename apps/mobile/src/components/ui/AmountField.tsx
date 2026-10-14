import { formatAmount } from '@meledger/shared';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { parseAmountInput } from '@/features/transactions/logic';
import { typography } from '@/theme/typography';
import { lightColors, spacing } from '@/theme/tokens';

import { FieldCard } from './FieldCard';
import { Text } from './Text';
import { PLACEHOLDER_COLOR } from './TextField';

interface AmountFieldProps {
  label: string;
  /** Whole shillings (minor units for UGX). */
  value: number;
  onChange: (value: number) => void;
  /** "xl" is the giant amount of the Add New inspiration. */
  size?: 'xl' | 'md';
  error?: string;
  autoFocus?: boolean;
  accessibilityLabel?: string;
  /** Grey fill for a field nested inside a white card. */
  inset?: boolean;
}

/** Money input with live thousands separators and a grey "UGX" before it. */
export function AmountField({
  label,
  value,
  onChange,
  size = 'md',
  error,
  autoFocus = false,
  accessibilityLabel,
  inset = false,
}: AmountFieldProps) {
  const [focused, setFocused] = useState(false);
  const xl = size === 'xl';
  return (
    <FieldCard label={label} error={error} focused={focused} style={inset && styles.inset}>
      <View style={styles.row}>
        <Text variant={xl ? 'title' : 'subtitle'} tone="muted">
          UGX
        </Text>
        <TextInput
          value={value ? formatAmount(value, 'UGX') : ''}
          onChangeText={(text) => onChange(parseAmountInput(text))}
          keyboardType="number-pad"
          // Money, not a saved value: no autofill bubble or suggestions.
          autoComplete="off"
          importantForAutofill="no"
          placeholder="0"
          placeholderTextColor={PLACEHOLDER_COLOR}
          cursorColor={lightColors.primary}
          autoFocus={autoFocus}
          accessibilityLabel={accessibilityLabel ?? label}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          // Fixed height and no extra line height: otherwise Android lets the single line scroll.
          style={[styles.input, xl ? styles.xl : styles.md]}
        />
      </View>
    </FieldCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  xl: { ...typography.amountXL, lineHeight: undefined, height: 56 },
  md: { ...typography.amount, lineHeight: undefined, height: 32 },
  inset: { backgroundColor: lightColors.background, boxShadow: 'none' },
  input: {
    flex: 1,
    padding: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
    color: lightColors.onSurface,
    fontVariant: ['tabular-nums'],
  },
});
