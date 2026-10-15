import { formatMoney } from '@meledger/shared';
import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { IconTile } from '@/components/ui/IconTile';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ProgressBar } from '@/components/ui/Progress';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import type { SheetRef } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { showSnackbar } from '@/features/feedback/snackbar';
import { MoneySheet } from '@/features/plan/components/MoneySheet';
import { debtBalance, dueLabel } from '@/features/plan/logic';
import { deleteDebt, recordRepayment, restoreDebt, setDebtStatus } from '@/features/plan/repo';
import { usePlanData, usePlanTransactions } from '@/features/plan/usePlanData';
import { TransactionRow } from '@/features/transactions/components/TransactionRow';
import { useLedger, useLedgerData } from '@/features/transactions/useLedgerData';
import { mainWalletId } from '@/features/wallets/logic';
import { lightColors, spacing } from '@/theme/tokens';

/** One debt: what is left, its entries, and Record repayment. */
export default function DebtScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const plan = usePlanData();
  const data = useLedgerData();
  const ledger = useLedger(data);
  const transactions = usePlanTransactions(data);
  const repay = useRef<SheetRef>(null);
  if (!plan || !data || !ledger) return <LoadingScreen />;
  const debt = plan.debts.find((d) => d.id === id);
  if (!debt) {
    return (
      <>
        <ScreenHeader title="Debt" />
        <EmptyState icon="debt" title="This debt no longer exists" />
      </>
    );
  }

  const owedToMe = debt.direction === 'owed_to_me';
  const balance = debtBalance(debt, transactions);
  const color = owedToMe ? lightColors.positive : lightColors.expense;
  const entries = data.transactions.filter((tx) => tx.debtId === debt.id);
  const wallets = new Map(data.wallets.map((w) => [w.id, w]));
  const categories = new Map(data.categories.map((c) => [c.id, c]));
  const settled = debt.status === 'settled';

  const remove = async () => {
    const stamp = await deleteDebt(debt.id);
    router.back();
    showSnackbar({
      message: 'Debt deleted',
      duration: 5000,
      action: { label: 'Undo', onPress: () => void restoreDebt(debt.id, stamp) },
    });
  };

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={debt.person}
        right={
          <IconButton
            icon="pencil"
            label="Edit debt"
            variant="surface"
            onPress={() => router.push({ pathname: '/debts/[id]/edit', params: { id: debt.id } })}
          />
        }
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
      >
        <Card style={styles.summary}>
          <View style={styles.row}>
            <IconTile icon={owedToMe ? 'lend' : 'borrow'} color={color} size={52} />
            <View style={styles.flex}>
              <Text variant="caption" tone="muted">
                {settled
                  ? 'Settled'
                  : owedToMe
                    ? `${debt.person} owes you`
                    : `You owe ${debt.person}`}
              </Text>
              <Text variant="amount" color={settled ? undefined : color}>
                {formatMoney(balance.remaining)}
              </Text>
            </View>
          </View>
          <ProgressBar value={balance.ratio} color={color} />
          <View style={styles.between}>
            <Text variant="caption" tone="muted">
              {formatMoney(balance.repaid)} of {formatMoney(balance.principal)} repaid
            </Text>
            {debt.dueAt && !settled ? (
              <Text variant="label">{dueLabel(debt.dueAt, new Date())}</Text>
            ) : null}
          </View>
          {debt.note ? (
            <Text variant="body" tone="muted">
              {debt.note}
            </Text>
          ) : null}
          <Text variant="small" tone="muted">
            Since {format(debt.startedAt ?? debt.createdAt, 'd MMM yyyy')}
          </Text>
        </Card>

        {settled ? (
          <Button
            label="Reopen"
            icon="restore"
            variant="secondary"
            block
            onPress={() => setDebtStatus(debt.id, 'open')}
          />
        ) : (
          <>
            <Button
              label={owedToMe ? 'Record money paid back' : 'Record a repayment'}
              icon="plus"
              block
              onPress={() => repay.current?.present()}
            />
            <Button
              label="Mark as settled"
              icon="check"
              variant="secondary"
              block
              onPress={() => setDebtStatus(debt.id, 'settled')}
            />
          </>
        )}

        {entries.length > 0 ? (
          <View style={styles.list}>
            <Text variant="title">Entries</Text>
            {entries.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                category={tx.categoryId ? categories.get(tx.categoryId) : undefined}
                wallet={wallets.get(tx.walletId)}
                toWallet={undefined}
                tags={[]}
                balanceAfter={ledger.balanceAfter.get(tx.id)}
              />
            ))}
          </View>
        ) : null}

        <Button label="Delete debt" icon="trash" variant="danger" block onPress={remove} />
      </ScrollView>

      <MoneySheet
        ref={repay}
        title={owedToMe ? `${debt.person} paid back` : `Pay back ${debt.person}`}
        hint={`${formatMoney(balance.remaining)} left`}
        confirmLabel="Save"
        initialAmount={balance.remaining}
        wallets={data.wallets}
        initialWalletId={mainWalletId(data.wallets)}
        walletLabel={owedToMe ? 'Into' : 'From'}
        max={{
          amount: balance.remaining,
          message: `Only ${formatMoney(balance.remaining)} is left on this debt`,
        }}
        onSubmit={async ({ amount, walletId, occurredAt }) => {
          await recordRepayment(
            debt,
            debt.person,
            { amount, walletId, occurredAt },
            balance.repaid,
          );
          showSnackbar({
            message:
              balance.repaid + amount >= balance.principal
                ? `All paid. ${debt.person}'s debt is settled`
                : `Saved ${formatMoney(amount)}`,
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.background },
  content: { paddingHorizontal: spacing.gutter, gap: spacing.md },
  summary: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  flex: { flex: 1, gap: 2 },
  list: { gap: spacing.sm, marginTop: spacing.lg },
});
