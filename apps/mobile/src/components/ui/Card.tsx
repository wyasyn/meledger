import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { lightColors, radius, spacing } from '@/theme/tokens';

/** White card, radius 20, 1px outline border, very soft shadow. */
export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: lightColors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: lightColors.outline,
    padding: spacing.lg,
    elevation: 1,
  },
});
