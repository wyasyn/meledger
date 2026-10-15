import { formatMoney } from '@meledger/shared';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/IconButton';
import { ListGroup, ListRow } from '@/components/ui/ListGroup';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import type { Debt } from '@/db/schema';
import { debtBalance } from '@/features/plan/logic';
import { usePlanData, usePlanTransactions } from '@/features/plan/usePlanData';
import { useLedgerData } from '@/features/transactions/useLedgerData';
import { lightColors, spacing } from '@/theme/tokens';

/** Open and settled debts. */
export default function DebtsScreen() {
  const insets = useSafeAreaInsets();
  const plan = usePlanData();
  const data = useLedgerData();
  const transactions = usePlanTransactions(data);
  if (!plan || !data) return <LoadingScreen />;

  const row = (debt: Debt & { person: string }) => {
    const b = debtBalance(debt, transactions);
    const owedToMe = debt.direction === 'owed_to_me';
    return (
      <ListRow
        key={debt.id}
        title={debt.person}
        subtitle={
          debt.status === 'settled'
            ? `Settled · ${formatMoney(b.principal)}`
            : owedToMe
              ? 'Owes you'
              : 'You owe'
        }
        icon={owedToMe ? 'lend' : 'borrow'}
        iconColor={owedToMe ? lightColors.positive : lightColors.expense}
        value={debt.status === 'settled' ? undefined : formatMoney(b.remaining)}
        onPress={() => router.push({ pathname: '/debts/[id]', params: { id: debt.id } })}
      />
    );
  };
  const open = plan.debts.filter((d) => d.status === 'open');
  const settled = plan.debts.filter((d) => d.status === 'settled');

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Debts & loans"
        right={
          <IconButton
            icon="plus"
            label="Add debt or loan"
            variant="dark"
            onPress={() => router.push('/debts/new')}
          />
        }
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
      >
        {open.length > 0 ? <ListGroup title="Open">{open.map(row)}</ListGroup> : null}
        {settled.length > 0 ? <ListGroup title="Settled">{settled.map(row)}</ListGroup> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.background },
  content: { paddingHorizontal: spacing.gutter, gap: spacing.xxl },
});
