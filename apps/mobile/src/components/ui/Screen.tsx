import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { lightColors, spacing } from '@/theme/tokens';

interface ScreenProps {
  title: string;
  children?: ReactNode;
}

/** Tab screen shell: background, screen padding 16, and a 20/600 title under the status bar. */
export function Screen({ title, children }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg }]}
    >
      <Text variant="titleLarge" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
});
