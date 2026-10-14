import { formatMoney, periodTotals, totalBalanceAt } from '@meledger/shared';
import { addMonths, format, subDays } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useMemo } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { BalanceHeader } from '@/features/home/components/BalanceHeader';
import { InsightBar } from '@/features/home/components/InsightBar';
import { MoneyCards } from '@/features/home/components/MoneyCards';
import { WalletStrip } from '@/features/home/components/WalletStrip';
import { useHomeStore } from '@/features/home/store';
import { TransactionRow } from '@/features/transactions/components/TransactionRow';
import { groupByDay } from '@/features/transactions/logic';
import { useLedger, useLedgerData } from '@/features/transactions/useLedgerData';
import { lightColors, radius, spacing } from '@/theme/tokens';

export default function HomeScreen() {
  const data = useLedgerData();
  const ledger = useLedger(data);
  const month = useHomeStore((s) => s.month);
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
    const from = month.getTime();
    const to = addMonths(month, 1).getTime();
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
  }, [data, ledger, month, walletId]);

  if (!data || !ledger || !view) return <LoadingScreen />;

  return (
    <SectionList
      style={styles.root}
      sections={view.sections}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <>
          <BalanceHeader balance={view.balance} weekChange={view.weekChange} />
          <View style={styles.sheet}>
            <MoneyCards month={month} income={view.totals.income} expense={view.totals.expense} />
            <InsightBar />
            <View style={styles.listHeader}>
              <Text variant="titleMedium">Transactions</Text>
              <View style={styles.periodChip}>
                <Text variant="labelMedium" style={styles.periodText}>
                  For the period
                </Text>
              </View>
            </View>
            <WalletStrip wallets={data.wallets} />
          </View>
        </>
      }
      renderSectionHeader={({ section }) => (
        <View style={styles.dayHeader}>
          <Text variant="bodySmall" style={styles.muted}>
            {section.title}
          </Text>
          <Text variant="bodySmall" style={styles.muted}>
            Total{' '}
            <Text variant="labelLarge" style={styles.dayTotal}>
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
          icon="notebook-outline"
          title={`No entries in ${format(month, 'MMMM')}`}
          body={
            walletId
              ? 'Nothing in this wallet for the month.'
              : 'Log what you spend and earn to see it here.'
          }
          action={
            <Button mode="contained" icon="plus" onPress={() => router.push('/transaction/new')}>
              Add an entry
            </Button>
          }
        />
      }
      contentContainerStyle={styles.content}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.background },
  content: { paddingBottom: 120 },
  sheet: {
    marginTop: -spacing.xxl,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: lightColors.background,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  periodChip: {
    backgroundColor: lightColors.primaryContainer,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  periodText: { color: lightColors.onPrimaryContainer },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  dayTotal: { color: lightColors.onSurface },
  muted: { color: lightColors.onSurfaceVariant },
  item: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
});
