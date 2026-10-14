import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { lightColors, radius, shadow, spacing } from '@/theme/tokens';

import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface SectionHeaderProps {
  title: string;
  /** Small white pill on the right ("Details >", "View all >"). */
  action?: { label: string; onPress: () => void };
  /** Custom trailing content instead of the pill. */
  right?: ReactNode;
}

/** Section title with an optional action pill, used to space and group screen sections. */
export function SectionHeader({ title, action, right }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text variant="title" accessibilityRole="header" style={styles.flex}>
        {title}
      </Text>
      {right}
      {action ? (
        <PressableScale
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={styles.pill}
        >
          <Text variant="label">{action.label}</Text>
          <Icon name="chevron-right" size={14} color={lightColors.onSurface} />
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 36 },
  flex: { flex: 1 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 34,
    paddingLeft: spacing.md + 2,
    paddingRight: spacing.sm + 2,
    borderRadius: radius.pill,
    backgroundColor: lightColors.surface,
    boxShadow: shadow.card,
  },
});
