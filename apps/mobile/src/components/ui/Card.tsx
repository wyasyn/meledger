import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { lightColors, radius, shadow, spacing } from '@/theme/tokens';

/** White card, radius 24, no border: a very soft shadow lifts it off the grey page. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: lightColors.surface,
    borderRadius: radius.card,
    padding: spacing.xl,
    boxShadow: shadow.card,
  },
});
