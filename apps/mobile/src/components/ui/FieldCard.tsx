import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { lightColors, radius, shadow, spacing, tint } from '@/theme/tokens';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface FieldCardProps {
  label?: string;
  error?: string;
  /** Shows the soft blue focus ring (text fields set this while focused). */
  focused?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/** White form card with a small grey label, as in the "Add New" inspiration. */
export function FieldCard({
  label,
  error,
  focused = false,
  onPress,
  accessibilityLabel,
  style,
  children,
}: FieldCardProps) {
  const cardStyle = [styles.card, focused && styles.focused, error ? styles.invalid : null, style];
  const body = (
    <>
      {label ? (
        <Text variant="caption" tone="muted">
          {label}
        </Text>
      ) : null}
      {children}
      {error ? (
        <Text variant="small" tone="expense" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </>
  );
  if (!onPress) return <View style={cardStyle}>{body}</View>;
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.985}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={cardStyle}
    >
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: lightColors.surface,
    borderRadius: radius.field,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    boxShadow: shadow.card,
  },
  focused: { boxShadow: `0 0 0 2px ${tint(lightColors.primary, 0.35)}` },
  invalid: { boxShadow: `0 0 0 2px ${tint(lightColors.expense, 0.35)}` },
});
