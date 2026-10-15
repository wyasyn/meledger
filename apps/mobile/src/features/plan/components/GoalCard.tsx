import { formatAmount, formatMoney } from '@meledger/shared';
import { format } from 'date-fns';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { IconTile } from '@/components/ui/IconTile';
import { Menu } from '@/components/ui/Menu';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import type { Goal } from '@/db/schema';
import { lightColors, paletteColor, radius, shadow, spacing } from '@/theme/tokens';

import { goalBandText, type GoalProgress } from '../logic';
import { GoalProgressBar } from './GoalProgressBar';

export type GoalAction = 'add' | 'edit' | 'delete';

const ACTIONS = [
  { value: 'add', label: 'Add money', icon: 'plus' },
  { value: 'edit', label: 'Edit goal', icon: 'pencil' },
  { value: 'delete', label: 'Delete goal', icon: 'trash', destructive: true },
] as const;

interface GoalCardProps {
  goal: Goal;
  progress: GoalProgress;
  onPress: () => void;
  onAction: (action: GoalAction) => void;
}

/**
 * Goal card (the goal card inspiration): icon tile, name and overflow menu, amount out of the
 * target, progress bar with the expected segment, and a band saying whether it is on schedule:
 * orange when behind or past the date, green when on track or reached.
 */
export function GoalCard({ goal, progress, onPress, onAction }: GoalCardProps) {
  const color = paletteColor(goal.color);
  const band = goalBandText(progress, goal.targetDate);
  const warn = progress.schedule === 'behind' || progress.schedule === 'overdue';
  const sub = goal.targetDate ? `By ${format(goal.targetDate, 'd MMM yyyy')}` : 'No target date';

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.985}
      accessibilityRole="button"
      accessibilityLabel={`${goal.name}. ${formatMoney(progress.saved)} out of ${formatMoney(
        progress.target,
      )}. ${band ?? sub}`}
      accessibilityHint="Opens the goal"
      style={styles.card}
    >
      <View style={styles.body}>
        <View style={styles.header}>
          <IconTile icon={goal.icon} color={goal.color} size={48} />
          <View style={styles.flex}>
            <Text variant="subtitle" numberOfLines={1}>
              {goal.name}
            </Text>
            <Text variant="caption" tone="muted">
              {sub}
            </Text>
          </View>
          <Menu
            items={ACTIONS}
            onSelect={onAction}
            accessibilityLabel={`${goal.name} actions`}
            anchor={(open) => (
              <PressableScale
                onPress={open}
                scaleTo={0.9}
                accessibilityRole="button"
                accessibilityLabel={`More actions for ${goal.name}`}
                hitSlop={4}
                style={styles.more}
              >
                <Icon name="more" weight="bold" size={20} color={lightColors.onSurface} />
              </PressableScale>
            )}
          />
        </View>

        <View style={styles.amountLine}>
          <Text variant="label" tone="muted">
            UGX
          </Text>
          <Text variant="amount">{formatAmount(progress.saved, 'UGX')}</Text>
          <Text variant="caption" tone="muted">
            out of
          </Text>
          <Text variant="label" tone="muted" style={styles.tabular}>
            {formatMoney(progress.target)}
          </Text>
        </View>

        <GoalProgressBar value={progress.ratio} expected={progress.expected} color={color} />

        <View style={styles.footerRow}>
          <Text variant="caption" tone="muted">
            Your progress · {Math.round(progress.ratio * 100)}%
          </Text>
          <Text variant="label" style={styles.tabular}>
            {progress.left > 0 ? `${formatMoney(progress.left)} left` : 'Done'}
          </Text>
        </View>
      </View>

      {band ? (
        <View
          style={[
            styles.band,
            { backgroundColor: warn ? lightColors.warning : lightColors.positive },
          ]}
        >
          <Icon
            name={warn ? 'info' : 'check'}
            weight="fill"
            size={16}
            color={lightColors.onWarning}
          />
          <Text variant="label" color={lightColors.onWarning} style={styles.flex}>
            {band}
          </Text>
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    backgroundColor: lightColors.surface,
    boxShadow: shadow.raised,
    overflow: 'hidden',
  },
  body: { padding: spacing.xl, gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  more: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: lightColors.background,
  },
  amountLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: spacing.xs + 2,
  },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
  band: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
});
