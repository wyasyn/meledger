import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_HEIGHT } from '@/components/navigation/TabBar';
import { lightColors, spacing } from '@/theme/tokens';

import { Text } from './Text';

interface ScreenProps {
  title: string;
  /** Trailing header content (e.g. an IconButton). */
  right?: ReactNode;
  children?: ReactNode;
}

/** Tab screen shell: grey page, large title under the status bar, section rhythm. */
export function Screen({ title, right, children }: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + spacing.lg,
          // Clears the floating tab bar.
          paddingBottom: insets.bottom + TAB_BAR_HEIGHT + spacing.xxl,
        },
      ]}
    >
      <View style={styles.header}>
        <Text variant="headline" accessibilityRole="header" style={styles.flex}>
          {title}
        </Text>
        {right}
      </View>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.background },
  content: { paddingHorizontal: spacing.gutter, gap: spacing.section },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  flex: { flex: 1 },
});
