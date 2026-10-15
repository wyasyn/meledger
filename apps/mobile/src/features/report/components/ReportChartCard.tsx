import { formatMoney } from '@meledger/shared';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { lightColors, radius, shadow, spacing } from '@/theme/tokens';

import type { Period } from '../../home/logic';
import {
  type BarGrouping,
  type Breakdown,
  type Bucket,
  buckets,
  donutSegments,
  type ReportKind,
  type ReportTransaction,
} from '../logic';
import { BarChart } from './BarChart';
import { DonutChart } from './DonutChart';

export type ChartType = 'donut' | 'bar';

interface ReportChartCardProps {
  kind: ReportKind;
  period: Period;
  breakdown: Breakdown;
  transactions: readonly ReportTransaction[];
  chart: ChartType;
  onChart: (chart: ChartType) => void;
}

const GROUPINGS = [
  { value: 'day', label: 'Days' },
  { value: 'week', label: 'Weeks' },
] as const;

/** "Expenses Report" card: donut by category, or bars by day or week (build prompt section 5.4). */
export function ReportChartCard({
  kind,
  period,
  breakdown,
  transactions,
  chart,
  onChart,
}: ReportChartCardProps) {
  const { width } = useWindowDimensions();
  const [grouping, setGrouping] = useState<BarGrouping>('day');
  const [inspected, setInspected] = useState<Bucket | null>(null);
  const noun = kind === 'expense' ? 'Expenses' : 'Income';
  const empty = breakdown.total === 0;
  const donutSize = Math.min(width - spacing.gutter * 2 - spacing.xl * 2, 300);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header" style={styles.flex}>
          {noun} Report
        </Text>
        <View style={styles.toggle} accessibilityRole="tablist">
          <ToggleIcon
            icon="chart-bar"
            label="Bar chart"
            active={chart === 'bar'}
            onPress={() => onChart('bar')}
          />
          <ToggleIcon
            icon="chart-donut"
            label="Donut chart"
            active={chart === 'donut'}
            onPress={() => onChart('donut')}
          />
        </View>
      </View>

      {empty ? (
        <EmptyState
          icon={kind === 'expense' ? 'expense' : 'income'}
          title={kind === 'expense' ? 'No spending this month' : 'No income this month'}
          body="Entries you log will be charted here."
        />
      ) : chart === 'donut' ? (
        <Animated.View key="donut" entering={FadeIn.duration(220)} style={styles.donut}>
          <DonutChart
            segments={donutSegments(breakdown.rows)}
            total={breakdown.total}
            label={`Total ${noun}`}
            size={donutSize}
          />
          <Text variant="small" tone="muted" align="center">
            Tap a segment to see its share
          </Text>
        </Animated.View>
      ) : (
        <Animated.View key="bar" entering={FadeIn.duration(220)} style={styles.bars}>
          <View accessibilityLiveRegion="polite" style={styles.readout}>
            <Text variant="caption" tone="muted">
              {inspected ? inspected.title : `Total ${noun.toLowerCase()}`}
            </Text>
            <Text variant="amount">
              {formatMoney(inspected ? inspected.value : breakdown.total)}
            </Text>
          </View>
          <SegmentedControl
            options={GROUPINGS}
            value={grouping}
            onChange={setGrouping}
            accessibilityLabel="Group bars by"
          />
          <BarChart
            data={buckets(transactions, kind, period, grouping)}
            color={kind === 'expense' ? lightColors.primary : lightColors.positive}
            onInspect={setInspected}
          />
          <Text variant="small" tone="muted" align="center">
            Press and slide across the bars to read them
          </Text>
        </Animated.View>
      )}
    </Card>
  );
}

function ToggleIcon({
  icon,
  label,
  active,
  onPress,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.9}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={[styles.toggleItem, active && styles.toggleActive]}
    >
      <Icon
        name={icon}
        weight={active ? 'fill' : 'regular'}
        size={18}
        color={active ? lightColors.onPrimary : lightColors.onSurfaceVariant}
      />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  toggle: {
    flexDirection: 'row',
    padding: 3,
    gap: 2,
    borderRadius: radius.pill,
    backgroundColor: lightColors.surface,
    boxShadow: shadow.raised,
  },
  toggleItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleActive: { backgroundColor: lightColors.primary },
  donut: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.sm },
  bars: { gap: spacing.md },
  readout: { gap: 2 },
});
