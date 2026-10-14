import { formatMoney, periodTotals, totalBalanceAt } from '@meledger/shared';
import { subDays } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useMemo, useRef } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TAB_BAR_HEIGHT } from '@/components/navigation/TabBar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { PressableScale } from '@/components/ui/PressableScale';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { SheetRef } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { BalanceHeader } from '@/features/home/components/BalanceHeader';
import { InsightBar } from '@/features/home/components/InsightBar';
import { MoneyCards } from '@/features/home/components/MoneyCards';
import { PeriodSheet } from '@/features/home/components/PeriodSheet';
import { WalletStrip } from '@/features/home/components/WalletStrip';
import { periodChipLabel, periodLabel } from '@/features/home/logic';
import { useHomeStore } from '@/features/home/store';
import { TransactionRow } from '@/features/transactions/components/TransactionRow';
import { groupByDay } from '@/features/transactions/logic';
import { useLedger, useLedgerData } from '@/features/transactions/useLedgerData';
import { lightColors, radius, spacing } from '@/theme/tokens';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const data = useLedgerData();
  const ledger = useLedger(data);
  const period = useHomeStore((s) => s.period);
  const setPeriod = useHomeStore((s) => s.setPeriod);
  const periodSheet = useRef<SheetRef>(null);
  const walletId = useHomeStore((s) => s.walletId);

  // The gradient header sits under the status bar, so use light icons while Home is focused.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  const view = useMemo(() => {
    if (!data || !ledger) return undefined;
    const from = period.from.getTime();
    const to = period.to.getTime();
    const balance = [...ledger.balances.values()].reduce((sum, b) => sum + b, 0);
    const weekChange =
      balance - totalBalanceAt(data.wallets, ledger.entries, subDays(data.loadedAt, 7).getTime());
    const shown = ledger.entries.filter(
      (tx) =>
        tx.occurredAt >= from &&
        tx.occurredAt < to &&
        (walletId === null || tx.walletId === walletId || tx.toWalletId === walletId),
    );
    return {
      balance,
      weekChange,
      totals: periodTotals(ledger.entries, from, to),
      sections: groupByDay(shown),
      byId: new Map(data.transactions.map((t) => [t.id, t])),
      wallets: new Map(data.wallets.map((w) => [w.id, w])),
      categories: new Map(data.categories.map((c) => [c.id, c])),
      tags: new Map(data.tags.map((t) => [t.id, t])),
    };
  }, [data, ledger, period, walletId]);

  if (!data || !ledger || !view) return <LoadingScreen />;
  const label = periodLabel(period);

  return (
    <>
      <SectionList
        style={styles.root}
        sections={view.sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <>
            <BalanceHeader balance={view.balance} weekChange={view.weekChange} />
            <View style={styles.sheet}>
              <MoneyCards
                periodLabel={label}
                income={view.totals.income}
                expense={view.totals.expense}
              />
              <InsightBar />
              <View style={styles.group}>
                <SectionHeader
                  title="Transactions"
                  right={
                    <PressableScale
                      onPress={() => periodSheet.current?.present()}
                      accessibilityRole="button"
                      accessibilityLabel={`Period: ${label}. Change`}
                      style={styles.periodChip}
                    >
                      <Icon name="calendar" size={14} color={lightColors.onPrimaryContainer} />
                      <Text variant="label" color={lightColors.onPrimaryContainer}>
                        {periodChipLabel(period, new Date())}
                      </Text>
                      <Icon
                        name="chevron-down"
                        weight="bold"
                        size={12}
                        color={lightColors.onPrimaryContainer}
                      />
                    </PressableScale>
                  }
                />
                <WalletStrip wallets={data.wallets} />
              </View>
            </View>
          </>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.dayHeader}>
            <Text variant="caption" tone="muted">
              {section.title}
            </Text>
            <Text variant="caption" tone="muted">
              Total{' '}
              <Text variant="label" style={styles.tabular}>
                {section.total > 0 ? '+' : ''}
                {formatMoney(section.total)}
              </Text>
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          const tx = view.byId.get(item.id);
          if (!tx) return null;
          return (
            <View style={styles.item}>
              <TransactionRow
                tx={tx}
                category={tx.categoryId ? view.categories.get(tx.categoryId) : undefined}
                wallet={view.wallets.get(tx.walletId)}
                toWallet={tx.toWalletId ? view.wallets.get(tx.toWalletId) : undefined}
                tags={(data.tagIdsByTransaction.get(tx.id) ?? []).flatMap((id) => {
                  const tag = view.tags.get(id);
                  return tag ? [tag] : [];
                })}
                balanceAfter={ledger.balanceAfter.get(tx.id)}
              />
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="note"
            title={`No entries for ${label}`}
            body={
              walletId
                ? 'Nothing in this wallet for this period.'
                : 'Log what you spend and earn to see it here.'
            }
            action={
              <Button
                label="Add an entry"
                icon="plus"
                onPress={() => router.push('/transaction/new')}
              />
            }
          />
        }
        // Clears the floating tab bar.
        contentContainerStyle={{ paddingBottom: insets.bottom + TAB_BAR_HEIGHT + spacing.xxl }}
      />
      <PeriodSheet
        ref={periodSheet}
        period={period}
        onSelect={(next) => {
          setPeriod(next);
          periodSheet.current?.dismiss();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.background },
  // Grey sheet that overlaps the blue header with rounded top corners.
  sheet: {
    marginTop: -spacing.xxxl,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: lightColors.background,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.xxl,
    gap: spacing.section,
  },
  group: { gap: spacing.md },
  periodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    height: 34,
    backgroundColor: lightColors.primaryContainer,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: spacing.gutter + spacing.xs,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm + 2,
  },
  tabular: { fontVariant: ['tabular-nums'] },
  item: { paddingHorizontal: spacing.gutter, paddingBottom: spacing.sm + 2 },
});
