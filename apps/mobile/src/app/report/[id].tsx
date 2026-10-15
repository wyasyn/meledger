import { formatMoney } from '@meledger/shared';
import { useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';
import { IconTile } from '@/components/ui/IconTile';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { monthPeriod, periodLabel } from '@/features/home/logic';
import {
  inRow,
  type ReportKind,
  TRANSFER_FEES_ID,
  UNCATEGORISED_ID,
} from '@/features/report/logic';
import { TransactionRow } from '@/features/transactions/components/TransactionRow';
import { useLedger, useLedgerData } from '@/features/transactions/useLedgerData';
import { lightColors, radius, shadow, spacing } from '@/theme/tokens';

/** The entries behind one category card of the report, for that month. */
export default function ReportCategoryScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; kind: ReportKind; from: string }>();
  const data = useLedgerData();
  const ledger = useLedger(data);
  if (!data || !ledger) return <LoadingScreen />;

  const kind: ReportKind = params.kind === 'income' ? 'income' : 'expense';
  const period = monthPeriod(params.from ? new Date(Number(params.from)) : new Date());
  const from = period.from.getTime();
  const to = period.to.getTime();
  const category = data.categories.find((c) => c.id === params.id);
  const name =
    category?.name ??
    (params.id === TRANSFER_FEES_ID
      ? 'Transfer fees'
      : params.id === UNCATEGORISED_ID
        ? 'No category'
        : 'Category');
  const rows = data.transactions.filter((tx) => {
    const at = tx.occurredAt.getTime();
    return at >= from && at < to && inRow({ ...tx, occurredAt: at }, kind, params.id);
  });
  const total = rows.reduce(
    (sum, tx) => sum + (params.id === TRANSFER_FEES_ID ? tx.feeAmount : tx.amount),
    0,
  );
  const wallets = new Map(data.wallets.map((w) => [w.id, w]));
  const categories = new Map(data.categories.map((c) => [c.id, c]));
  const tags = new Map(data.tags.map((t) => [t.id, t]));

  return (
    <View style={styles.root}>
      <ScreenHeader title={name} />
      <FlatList
        data={rows}
        keyExtractor={(tx) => tx.id}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        ListHeaderComponent={
          <View style={styles.summary} accessible>
            <IconTile
              icon={category?.icon ?? (params.id === TRANSFER_FEES_ID ? 'fees' : 'category')}
              color={category?.color ?? 'slate'}
              size={52}
            />
            <View style={styles.flex}>
              <Text variant="caption" tone="muted">
                {periodLabel(period)} · {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
              </Text>
              <Text variant="amount">{formatMoney(total)}</Text>
            </View>
          </View>
        }
        renderItem={({ item: tx }) => (
          <TransactionRow
            tx={tx}
            category={tx.categoryId ? categories.get(tx.categoryId) : undefined}
            wallet={wallets.get(tx.walletId)}
            toWallet={tx.toWalletId ? wallets.get(tx.toWalletId) : undefined}
            tags={(data.tagIdsByTransaction.get(tx.id) ?? []).flatMap((id) => {
              const tag = tags.get(id);
              return tag ? [tag] : [];
            })}
            balanceAfter={ledger.balanceAfter.get(tx.id)}
          />
        )}
        ListEmptyComponent={<EmptyState icon="empty" title="Nothing here this month" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.background },
  content: { paddingHorizontal: spacing.gutter, gap: spacing.sm + 2 },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
    borderRadius: radius.card,
    backgroundColor: lightColors.surface,
    boxShadow: shadow.card,
  },
  flex: { flex: 1, gap: 2 },
});
