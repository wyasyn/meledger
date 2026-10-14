import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { HelperText, Text } from 'react-native-paper';

import { lightColors, radius, spacing } from '@/theme/tokens';

interface FieldCardProps {
  label?: string;
  error?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  children: ReactNode;
}

/** White form card with a small grey label, as in the "Add New" inspiration. */
export function FieldCard({ label, error, onPress, accessibilityLabel, children }: FieldCardProps) {
  const body = (
    <>
      {label ? (
        <Text variant="bodyMedium" style={styles.label}>
          {label}
        </Text>
      ) : null}
      {children}
      {error ? (
        <HelperText type="error" padding="none">
          {error}
        </HelperText>
      ) : null}
    </>
  );
  if (!onPress) return <View style={styles.card}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: lightColors.primaryContainer }}
      style={styles.card}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: lightColors.surface,
    borderRadius: radius.small + 4,
    padding: spacing.lg,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  label: { color: lightColors.onSurfaceVariant },
});
