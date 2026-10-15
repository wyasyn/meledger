import { formatMoney } from '@meledger/shared';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { monthPeriod, type Period } from '@/features/home/logic';
import { CategoryCard } from '@/features/report/components/CategoryCard';
import { MonthPill } from '@/features/report/components/MonthPill';
import { type ChartType, ReportChartCard } from '@/features/report/components/ReportChartCard';
import {
  categoryBreakdown,
  distinctColors,
  type ReportKind,
  type ReportTransaction,
} from '@/features/report/logic';
import { useLedgerData } from '@/features/transactions/useLedgerData';
import { spacing } from '@/theme/tokens';

const KINDS = [
  { value: 'expense', label: 'Expenses' },
  { value: 'income', label: 'Income' },
] as const;

export default function ReportScreen() {
  const data = useLedgerData();
  const [period, setPeriod] = useState<Period>(() => monthPeriod(new Date()));
  const [kind, setKind] = useState<ReportKind>('expense');
  const [chart, setChart] = useState<ChartType>('donut');

  const transactions = useMemo(
    (): ReportTransaction[] =>
      (data?.transactions ?? []).map((tx) => ({
        type: tx.type,
        amount: tx.amount,
        feeAmount: tx.feeAmount,
        categoryId: tx.categoryId,
        occurredAt: tx.occurredAt.getTime(),
      })),
    [data],
  );
  const breakdown = useMemo(() => {
    const b = categoryBreakdown(transactions, data?.categories ?? [], kind, period);
    return { ...b, rows: distinctColors(b.rows) };
  }, [transactions, data, kind, period]);

  if (!data) return <LoadingScreen />;
  const noun = kind === 'expense' ? 'Expenses' : 'Income';

  return (
    <Screen title="Report" right={<MonthPill period={period} onChange={setPeriod} />}>
      <View style={styles.top}>
        <SegmentedControl
          options={KINDS}
          value={kind}
          onChange={setKind}
          accessibilityLabel="Report on"
        />
        <ReportChartCard
          kind={kind}
          period={period}
          breakdown={breakdown}
          transactions={transactions}
          chart={chart}
          onChart={setChart}
        />
      </View>

      {breakdown.rows.length > 0 ? (
        <View style={styles.list}>
          <View style={styles.listHeader}>
            <Text variant="label" tone="muted" style={styles.flex}>
              All {noun}
            </Text>
            <Text variant="caption" tone="muted">
              Total{' '}
              <Text variant="subtitle" style={styles.tabular}>
                {formatMoney(breakdown.total)}
              </Text>
            </Text>
          </View>
          {breakdown.rows.map((row, i) => (
            <Animated.View
              key={`${kind}-${row.id}`}
              entering={FadeInDown.duration(260).delay(Math.min(i, 6) * 40)}
            >
              <CategoryCard
                row={row}
                kind={kind}
                compareLabel="vs last month"
                onPress={() =>
                  router.push({
                    pathname: '/report/[id]',
                    params: { id: row.id, kind, from: String(period.from.getTime()) },
                  })
                }
              />
            </Animated.View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { gap: spacing.lg },
  list: { gap: spacing.md },
  listHeader: { flexDirection: 'row', alignItems: 'baseline', paddingHorizontal: spacing.xs },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
});
