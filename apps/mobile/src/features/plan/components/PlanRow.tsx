import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { lightColors, radius, shadow, spacing } from '@/theme/tokens';

interface PlanRowProps {
  icon: string;
  /** Palette key or hex. */
  color: string;
  title: string;
  /** Second line: an amount line such as "UGX 250,000 of UGX 750,000". */
  detail?: ReactNode;
  /** Small grey third line ("This month", "Due tomorrow"). */
  caption?: ReactNode;
  trailing?: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
}

/** White card row of the Plan tab (budgets, bills, debts, savings groups). */
export function PlanRow({
  icon,
  color,
  title,
  detail,
  caption,
  trailing,
  onPress,
  accessibilityLabel,
  accessibilityHint,
}: PlanRowProps) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={styles.row}
    >
      <IconTile icon={icon} color={color} size={48} />
      <View style={styles.middle}>
        <Text variant="subtitle" numberOfLines={1}>
          {title}
        </Text>
        {typeof detail === 'string' ? (
          <Text variant="label" numberOfLines={1} style={styles.tabular}>
            {detail}
          </Text>
        ) : (
          detail
        )}
        {typeof caption === 'string' ? (
          <Text variant="small" tone="muted" numberOfLines={1}>
            {caption}
          </Text>
        ) : (
          caption
        )}
      </View>
      {trailing}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md + 2,
    padding: spacing.lg,
    borderRadius: radius.card - 4,
    backgroundColor: lightColors.surface,
    boxShadow: shadow.card,
  },
  middle: { flex: 1, gap: 2 },
  tabular: { fontVariant: ['tabular-nums'] },
});
