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
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import type { SheetRef } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { showSnackbar } from '@/features/feedback/snackbar';
import { MoneySheet } from '@/features/plan/components/MoneySheet';
import { groupSchedule, groupTotals, parseMembers } from '@/features/plan/logic';
import {
  contributeToGroup,
  receiveGroupPayout,
  setSavingsGroupArchived,
} from '@/features/plan/repo';
import { usePlanData, usePlanTransactions } from '@/features/plan/usePlanData';
import { TransactionRow } from '@/features/transactions/components/TransactionRow';
import { useLedger, useLedgerData } from '@/features/transactions/useLedgerData';
import { mainWalletId } from '@/features/wallets/logic';
import { lightColors, spacing } from '@/theme/tokens';

/**
 * One savings group: next contribution, the user's payout turn, money in and out, and the
 * contributions and payouts as entries (transfers with the group's wallet).
 */
export default function GroupScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const plan = usePlanData();
  const data = useLedgerData();
  const ledger = useLedger(data);
  const transactions = usePlanTransactions(data);
  const contribute = useRef<SheetRef>(null);
  const payout = useRef<SheetRef>(null);
  if (!plan || !data || !ledger) return <LoadingScreen />;
  const group = plan.groups.find((g) => g.id === id);
  if (!group) {
    return (
      <>
        <ScreenHeader title="Savings group" />
        <EmptyState icon="group" title="This group no longer exists" />
      </>
    );
  }

  const members = parseMembers(group.members);
  const schedule = groupSchedule({ ...group, members }, new Date());
  const totals = groupTotals(group.walletId, transactions);
  const entries = data.transactions.filter(
    (tx) => tx.walletId === group.walletId || tx.toWalletId === group.walletId,
  );
  const wallets = new Map(data.wallets.map((w) => [w.id, w]));
  const ownWallets = data.wallets.filter((w) => w.id !== group.walletId);

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={group.name}
        right={
          <IconButton
            icon="pencil"
            label="Edit group"
            variant="surface"
            onPress={() => router.push({ pathname: '/groups/[id]/edit', params: { id: group.id } })}
          />
        }
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
      >
        <Card style={styles.card}>
          <View style={styles.row}>
            <IconTile icon="savings-group" color="teal" size={52} />
            <View style={styles.flex}>
              <Text variant="caption" tone="muted">
                Next contribution · round {schedule.round}
              </Text>
              <Text variant="title">{format(schedule.nextContribution, 'EEEE d MMM')}</Text>
              <Text variant="label" tone="muted">
                {formatMoney(group.contributionAmount)}{' '}
                {group.frequency === 'weekly' ? 'every week' : 'every month'}
              </Text>
            </View>
          </View>
          {schedule.payoutDate && group.payoutTurn ? (
            <View style={styles.payout}>
              <Text variant="caption" tone="muted">
                Your payout · turn {group.payoutTurn} of {schedule.memberCount}
              </Text>
              <Text variant="subtitle">
                {formatMoney(schedule.payoutAmount)} around{' '}
                {format(schedule.payoutDate, 'd MMM yyyy')}
              </Text>
            </View>
          ) : null}
          <View style={styles.stats}>
            <Stat label="You've put in" value={formatMoney(totals.contributed)} />
            <Stat label="You've received" value={formatMoney(totals.received)} />
          </View>
          {members.length > 0 ? (
            <Text variant="small" tone="muted">
              With {members.join(', ')}
            </Text>
          ) : null}
        </Card>

        <Button
          label="Record a contribution"
          icon="plus"
          block
          onPress={() => contribute.current?.present()}
        />
        <Button
          label="Record a payout"
          icon="income"
          variant="secondary"
          block
          onPress={() => payout.current?.present()}
        />

        {entries.length > 0 ? (
          <View style={styles.list}>
            <Text variant="title">History</Text>
            {entries.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                category={undefined}
                wallet={wallets.get(tx.walletId)}
                toWallet={tx.toWalletId ? wallets.get(tx.toWalletId) : undefined}
                tags={[]}
                balanceAfter={undefined}
              />
            ))}
          </View>
        ) : null}

        <Button
          label={group.archived ? 'Unarchive group' : 'Archive group'}
          icon={group.archived ? 'restore' : 'archive'}
          variant="secondary"
          block
          onPress={async () => {
            await setSavingsGroupArchived(group.id, !group.archived);
            if (!group.archived) {
              router.back();
              showSnackbar({
                message: `Archived ${group.name}`,
                duration: 5000,
                action: {
                  label: 'Undo',
                  onPress: () => void setSavingsGroupArchived(group.id, false),
                },
              });
            } else {
              showSnackbar({ message: `${group.name} is back on your Plan` });
            }
          }}
        />
      </ScrollView>

      <MoneySheet
        ref={contribute}
        title={`Contribute to ${group.name}`}
        hint="Moves money from your wallet into the group's savings wallet."
        confirmLabel="Contribute"
        initialAmount={group.contributionAmount}
        wallets={ownWallets}
        initialWalletId={mainWalletId(ownWallets)}
        walletLabel="From"
        withFee
        onSubmit={async (values) => {
          await contributeToGroup(group, values);
          showSnackbar({ message: `Contributed ${formatMoney(values.amount)}` });
        }}
      />
      <MoneySheet
        ref={payout}
        title={`Payout from ${group.name}`}
        hint="Money you received from the group."
        confirmLabel="Save"
        initialAmount={schedule.payoutAmount}
        wallets={ownWallets}
        initialWalletId={mainWalletId(ownWallets)}
        walletLabel="Into"
        onSubmit={async (values) => {
          await receiveGroupPayout(group, values);
          showSnackbar({ message: `Received ${formatMoney(values.amount)}` });
        }}
      />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text variant="subtitle" style={styles.tabular}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.background },
  content: { paddingHorizontal: spacing.gutter, gap: spacing.md },
  card: { gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  flex: { flex: 1, gap: 2 },
  payout: {
    gap: 2,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: lightColors.primaryContainer,
  },
  stats: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, gap: 2 },
  list: { gap: spacing.sm, marginTop: spacing.lg },
  tabular: { fontVariant: ['tabular-nums'] },
});
