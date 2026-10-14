import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { lightColors, spacing } from '@/theme/tokens';

/** Back arrow, 20/600 title and an optional trailing slot, for stack screens. */
export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + spacing.sm }]}>
      <IconButton
        icon="arrow-left"
        accessibilityLabel="Back"
        onPress={() => router.back()}
        iconColor={lightColors.onSurface}
      />
      <Text variant="titleLarge" accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.sm,
    paddingRight: spacing.lg,
    backgroundColor: lightColors.background,
  },
  title: { flex: 1 },
});
