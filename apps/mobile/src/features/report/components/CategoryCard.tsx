import { formatMoney } from '@meledger/shared';
import { StyleSheet, View } from 'react-native';

import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { ProgressBar } from '@/components/ui/Progress';
import { Text } from '@/components/ui/Text';
import { lightColors, paletteColor, radius, shadow, spacing } from '@/theme/tokens';

import { type CategoryRow, changeIsGood, changeLabel, type ReportKind } from '../logic';

interface CategoryCardProps {
  row: CategoryRow;
  kind: ReportKind;
  /** "vs last month" or "vs previous period". */
  compareLabel: string;
  onPress: () => void;
}

/**
 * One category of the report (the category cards inspiration): icon tile, name and share of the
 * total, amount with a coloured change pill, and a bar in the category's colour.
 */
export function CategoryCard({ row, kind, compareLabel, onPress }: CategoryCardProps) {
  const color = paletteColor(row.color);
  const pct = Math.round(row.share * 1000) / 10;
  const good = row.change !== null && changeIsGood(row.change, kind);
  const pillColor =
    row.change === null ? lightColors.primary : good ? lightColors.positive : lightColors.expense;
  const pillBg =
    row.change === null
      ? lightColors.primaryContainer
      : good
        ? lightColors.positiveContainer
        : lightColors.expenseContainer;
  const change = row.change === null ? 'New' : changeLabel(row.change);

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`${row.name}, ${formatMoney(row.amount)}, ${pct}% of total, ${
        row.change === null
          ? `new ${compareLabel.replace('vs ', 'since ')}`
          : `${change} ${compareLabel}`
      }`}
      accessibilityHint="Shows these entries"
      style={styles.card}
    >
      <View style={styles.top}>
        <IconTile icon={row.icon} color={row.color} />
        <View style={styles.middle}>
          <Text variant="subtitle" numberOfLines={1}>
            {row.name}
          </Text>
          <Text variant="caption" tone="muted">
            {pct}% of total
          </Text>
        </View>
        <View style={styles.right}>
          <Text variant="subtitle" style={styles.tabular}>
            {formatMoney(row.amount)}
          </Text>
          <View style={styles.changeRow}>
            <View style={[styles.pill, { backgroundColor: pillBg }]}>
              <Text variant="micro" color={pillColor}>
                {change}
              </Text>
            </View>
            <Text variant="small" tone="muted">
              {compareLabel}
            </Text>
          </View>
        </View>
      </View>
      <ProgressBar value={row.share} color={color} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.card - 4,
    backgroundColor: lightColors.surface,
    boxShadow: shadow.card,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  middle: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  tabular: { fontVariant: ['tabular-nums'] },
});
