import { formatMoney } from '@meledger/shared';
import { format } from 'date-fns';
import { type Href, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { ListGroup, ListRow } from '@/components/ui/ListGroup';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Menu } from '@/components/ui/Menu';
import { Badge, ProgressRing } from '@/components/ui/Progress';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Sheet, type SheetRef } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import type { Goal, RecurringRule } from '@/db/schema';
import { showSnackbar } from '@/features/feedback/snackbar';
import { GoalCard } from '@/features/plan/components/GoalCard';
import { MoneySheet } from '@/features/plan/components/MoneySheet';
import { PlanRow } from '@/features/plan/components/PlanRow';
import {
  budgetPeriodLabel,
  budgetStatus,
  debtBalance,
  dueLabel,
  dueState,
  goalProgress,
  groupSchedule,
  groupTotals,
  parseMembers,
  parseTemplate,
  savedByGoal,
} from '@/features/plan/logic';
import { planSummary } from '@/features/plan/summary';
import {
  addContribution,
  advanceRecurring,
  deleteGoal,
  deleteRecurring,
  restoreGoal,
  restoreRecurring,
  setRecurringDue,
} from '@/features/plan/repo';
import { usePlanData, usePlanTransactions } from '@/features/plan/usePlanData';
import { useLedgerData } from '@/features/transactions/useLedgerData';
import { openRecurringSheet } from '@/features/voice/store';
import { lightColors, paletteColor, spacing } from '@/theme/tokens';

const ADD_ITEMS = [
  { value: '/goals/new', label: 'Goal', icon: 'target' },
  { value: '/budgets/new', label: 'Budget', icon: 'report' },
  { value: '/bills/new', label: 'Recurring bill', icon: 'repeat' },
  { value: '/debts/new', label: 'Debt or loan', icon: 'debt' },
  { value: '/groups/new', label: 'Savings group', icon: 'group' },
] as const;

/** Goals shown on the Plan tab; the rest are under View all. */
const GOALS_SHOWN = 2;
const BUDGETS_SHOWN = 4;

export default function PlanScreen() {
  const plan = usePlanData();
  const ledger = useLedgerData();
  const [goalForMoney, setGoalForMoney] = useState<Goal | null>(null);
  const [bill, setBill] = useState<RecurringRule | null>(null);
  const moneySheet = useRef<SheetRef>(null);
  const billSheet = useRef<SheetRef>(null);
  const afterBillSheet = useRef<(() => void) | null>(null);

  const transactions = usePlanTransactions(ledger);

  if (!plan || !ledger) return <LoadingScreen />;
  const now = new Date();
  const categories = new Map(ledger.categories.map((c) => [c.id, c]));
  const saved = savedByGoal(plan.contributions);
  const activeGoals = plan.goals.filter((g) => g.status !== 'archived');
  const openDebts = plan.debts.filter((d) => d.status === 'open');
  const groups = plan.groups.filter((g) => !g.archived);

  const goalAction = async (goal: Goal, action: 'add' | 'edit' | 'delete') => {
    if (action === 'add') {
      setGoalForMoney(goal);
      moneySheet.current?.present();
    } else if (action === 'edit') {
      router.push({ pathname: '/goals/[id]', params: { id: goal.id } });
    } else {
      await deleteGoal(goal.id);
      showSnackbar({
        message: `Deleted ${goal.name}`,
        duration: 5000,
        action: { label: 'Undo', onPress: () => void restoreGoal(goal.id) },
      });
    }
  };

  const share = () => {
    const message = planSummary({ plan, ledger, transactions, now });
    Share.share({ title: 'My MeLedger plan', message });
  };

  const openBill = (rule: RecurringRule) => {
    setBill(rule);
    billSheet.current?.present();
  };

  const hasAnything =
    activeGoals.length +
      plan.budgets.length +
      plan.recurring.length +
      openDebts.length +
      groups.length >
    0;

  return (
    <>
      <Screen
        title="My Plan"
        right={
          <View style={styles.headerActions}>
            <Menu
              items={ADD_ITEMS}
              onSelect={(href) => router.push(href as Href)}
              accessibilityLabel="Add to your plan"
              anchor={(open) => (
                <IconButton icon="plus" label="Add to your plan" variant="dark" onPress={open} />
              )}
            />
            <IconButton
              icon="share"
              label="Share your plan"
              variant="surface"
              onPress={share}
              disabled={!hasAnything}
            />
          </View>
        }
      >
        {/* Goals */}
        <View style={styles.section}>
          <SectionHeader
            title="Goals"
            action={
              activeGoals.length > GOALS_SHOWN
                ? { label: 'View all', onPress: () => router.push('/goals') }
                : undefined
            }
          />
          {activeGoals.length === 0 ? (
            <AddCard
              icon="target"
              title="Save for something"
              body="Set a target and a date. MeLedger shows if you're on schedule."
              label="Add a goal"
              href="/goals/new"
            />
          ) : (
            activeGoals.slice(0, GOALS_SHOWN).map((goal, i) => (
              <Animated.View key={goal.id} entering={FadeInDown.duration(260).delay(i * 50)}>
                <GoalCard
                  goal={goal}
                  progress={goalProgress(goal, saved.get(goal.id) ?? 0, now)}
                  onPress={() => router.push({ pathname: '/goals/[id]', params: { id: goal.id } })}
                  onAction={(action) => goalAction(goal, action)}
                />
              </Animated.View>
            ))
          )}
        </View>

        {/* Budgets */}
        <View style={styles.section}>
          <SectionHeader
            title="Budgets"
            action={
              plan.budgets.length > BUDGETS_SHOWN
                ? { label: 'View all', onPress: () => router.push('/budgets') }
                : undefined
            }
          />
          {plan.budgets.length === 0 ? (
            <AddCard
              icon="report"
              title="Keep spending in check"
              body="Set a limit for a category, per month, per week or for your own dates."
              label="Add a budget"
              href="/budgets/new"
            />
          ) : (
            plan.budgets.slice(0, BUDGETS_SHOWN).map((budget) => {
              const category = categories.get(budget.categoryId);
              const status = budgetStatus(budget, transactions, now);
              const ringColor =
                status.state === 'over'
                  ? lightColors.expense
                  : paletteColor(category?.color ?? 'slate');
              return (
                <PlanRow
                  key={budget.id}
                  icon={category?.icon ?? 'category'}
                  color={category?.color ?? 'slate'}
                  title={category?.name ?? 'Category'}
                  detail={`${formatMoney(status.spent)} of ${formatMoney(status.limit)}`}
                  caption={
                    status.state === 'over'
                      ? `${formatMoney(-status.remaining)} over · ${budgetPeriodLabel(budget, now)}`
                      : `${formatMoney(status.remaining)} left · ${budgetPeriodLabel(budget, now)}`
                  }
                  trailing={<ProgressRing value={status.ratio} size={52} color={ringColor} />}
                  onPress={() =>
                    router.push({ pathname: '/budgets/[id]', params: { id: budget.id } })
                  }
                  accessibilityLabel={`${category?.name ?? 'Budget'}: ${formatMoney(
                    status.spent,
                  )} of ${formatMoney(status.limit)}, ${Math.round(status.ratio * 100)}%`}
                  accessibilityHint="Edits the budget"
                />
              );
            })
          )}
        </View>

        {/* Recurring bills */}
        <View style={styles.section}>
          <SectionHeader title="Recurring bills" />
          {plan.recurring.length === 0 ? (
            <AddCard
              icon="repeat"
              title="Never miss rent or Yaka"
              body="Add bills that come back. You confirm each one when it's due."
              label="Add a bill"
              href="/bills/new"
            />
          ) : (
            plan.recurring.map((rule) => {
              const template = parseTemplate(rule.template);
              const category = template?.categoryId
                ? categories.get(template.categoryId)
                : undefined;
              const state = dueState(rule.nextDueAt, now);
              const due = state === 'overdue' || state === 'today';
              return (
                <PlanRow
                  key={rule.id}
                  icon={category?.icon ?? 'repeat'}
                  color={category?.color ?? 'slate'}
                  title={rule.name}
                  detail={template ? formatMoney(template.amount) : undefined}
                  caption={`${dueLabel(rule.nextDueAt, now)} · ${format(rule.nextDueAt, 'EEE d MMM')}`}
                  trailing={
                    due ? (
                      <Badge
                        label={state === 'overdue' ? 'Overdue' : 'Due'}
                        color={state === 'overdue' ? lightColors.expense : lightColors.warning}
                      />
                    ) : state === 'soon' ? (
                      <Badge label="Soon" color={lightColors.primary} />
                    ) : undefined
                  }
                  onPress={() => openBill(rule)}
                  accessibilityLabel={`${rule.name}, ${template ? formatMoney(template.amount) : ''}, ${dueLabel(rule.nextDueAt, now)}`}
                  accessibilityHint="Log, skip or edit this bill"
                />
              );
            })
          )}
        </View>

        {/* Debts and loans */}
        <View style={styles.section}>
          <SectionHeader
            title="Debts & loans"
            action={
              plan.debts.length > openDebts.length
                ? { label: 'All', onPress: () => router.push('/debts') }
                : undefined
            }
          />
          {openDebts.length === 0 ? (
            <AddCard
              icon="debt"
              title="Who owes whom"
              body='Track money you lent or borrowed. Say "lent Musa 100k" or add it here.'
              label="Add a debt or loan"
              href="/debts/new"
            />
          ) : (
            openDebts.map((debt) => {
              const balance = debtBalance(debt, transactions);
              const owedToMe = debt.direction === 'owed_to_me';
              return (
                <PlanRow
                  key={debt.id}
                  icon={owedToMe ? 'lend' : 'borrow'}
                  color={owedToMe ? lightColors.positive : lightColors.expense}
                  title={debt.person}
                  detail={
                    <Text
                      variant="label"
                      color={owedToMe ? lightColors.positive : lightColors.expense}
                      style={styles.tabular}
                    >
                      {owedToMe ? 'Owes you ' : 'You owe '}
                      {formatMoney(balance.remaining)}
                    </Text>
                  }
                  caption={
                    debt.dueAt
                      ? `${dueLabel(debt.dueAt, now)} · ${formatMoney(balance.repaid)} repaid`
                      : `${formatMoney(balance.repaid)} of ${formatMoney(balance.principal)} repaid`
                  }
                  trailing={
                    <ProgressRing
                      value={balance.ratio}
                      size={44}
                      color={owedToMe ? lightColors.positive : lightColors.expense}
                    />
                  }
                  onPress={() => router.push({ pathname: '/debts/[id]', params: { id: debt.id } })}
                  accessibilityLabel={`${debt.person} ${owedToMe ? 'owes you' : 'you owe'} ${formatMoney(
                    balance.remaining,
                  )}`}
                />
              );
            })
          )}
        </View>

        {/* Savings groups */}
        <View style={styles.section}>
          <SectionHeader title="Savings groups" />
          {groups.length === 0 ? (
            <AddCard
              icon="group"
              title="SACCO, VSLA or chama"
              body="Track your contributions and when it's your turn to receive."
              label="Add a savings group"
              href="/groups/new"
            />
          ) : (
            groups.map((group) => {
              const schedule = groupSchedule(
                { ...group, members: parseMembers(group.members) },
                now,
              );
              const totals = groupTotals(group.walletId, transactions);
              const payout =
                schedule.payoutDate && group.payoutTurn
                  ? `Your payout: turn ${group.payoutTurn} of ${schedule.memberCount} · ${format(
                      schedule.payoutDate,
                      'd MMM',
                    )}`
                  : `${formatMoney(totals.contributed)} contributed`;
              return (
                <PlanRow
                  key={group.id}
                  icon="savings-group"
                  color="teal"
                  title={group.name}
                  detail={`${formatMoney(group.contributionAmount)} ${
                    group.frequency === 'weekly' ? 'weekly' : 'monthly'
                  } · next ${format(schedule.nextContribution, 'EEE d MMM')}`}
                  caption={payout}
                  onPress={() =>
                    router.push({ pathname: '/groups/[id]', params: { id: group.id } })
                  }
                  accessibilityLabel={`${group.name}, ${formatMoney(group.contributionAmount)} ${group.frequency}, next contribution ${format(
                    schedule.nextContribution,
                    'EEEE d MMMM',
                  )}. ${payout}`}
                  trailing={undefined}
                />
              );
            })
          )}
        </View>
      </Screen>

      <MoneySheet
        ref={moneySheet}
        title={goalForMoney ? `Add to ${goalForMoney.name}` : 'Add money'}
        hint="Records money you've set aside for this goal."
        confirmLabel="Add"
        initialAmount={0}
        onSubmit={async ({ amount, occurredAt }) => {
          if (!goalForMoney) return;
          await addContribution(goalForMoney.id, { amount, occurredAt });
          showSnackbar({ message: `Added ${formatMoney(amount)} to ${goalForMoney.name}` });
        }}
      />

      <Sheet
        ref={billSheet}
        title={bill?.name ?? 'Bill'}
        onDismiss={() => {
          const next = afterBillSheet.current;
          afterBillSheet.current = null;
          next?.();
        }}
      >
        {bill ? (
          <BillActions
            rule={bill}
            onClose={(then) => {
              // Opening another sheet or screen before this one has closed leaves its Back
              // handler registered, so the follow-up runs once it is gone.
              afterBillSheet.current = then ?? null;
              billSheet.current?.dismiss();
            }}
          />
        ) : (
          <View />
        )}
      </Sheet>
    </>
  );
}

function BillActions({
  rule,
  onClose,
}: {
  rule: RecurringRule;
  /** Closes the sheet, then runs `then`. */
  onClose: (then?: () => void) => void;
}) {
  const now = new Date();
  const template = parseTemplate(rule.template);
  return (
    <View style={styles.sheetBody}>
      <Text variant="caption" tone="muted">
        {template ? `${formatMoney(template.amount)} · ` : ''}
        {dueLabel(rule.nextDueAt, now)} ({format(rule.nextDueAt, 'EEEE d MMM')})
      </Text>
      <ListGroup>
        <ListRow
          title="Log it now"
          subtitle="Opens the entry to check, then save"
          icon="calendar-check"
          iconColor="blue"
          onPress={() => {
            onClose(() => openRecurringSheet(rule));
          }}
        />
        <ListRow
          title="Skip this time"
          subtitle="Moves it to the next due date"
          icon="chevron-right"
          iconColor="slate"
          onPress={async () => {
            const previous = rule.nextDueAt;
            await advanceRecurring(rule);
            onClose();
            showSnackbar({
              message: `Skipped ${rule.name}`,
              duration: 5000,
              action: { label: 'Undo', onPress: () => void setRecurringDue(rule.id, previous) },
            });
          }}
        />
        <ListRow
          title="Edit bill"
          icon="pencil"
          iconColor="slate"
          onPress={() => {
            onClose(() => router.push({ pathname: '/bills/[id]', params: { id: rule.id } }));
          }}
        />
        <ListRow
          title="Delete bill"
          icon="trash"
          iconColor="#EF4444"
          onPress={async () => {
            await deleteRecurring(rule.id);
            onClose();
            showSnackbar({
              message: `Deleted ${rule.name}`,
              duration: 5000,
              action: { label: 'Undo', onPress: () => void restoreRecurring(rule.id) },
            });
          }}
        />
      </ListGroup>
    </View>
  );
}

function AddCard({
  icon,
  title,
  body,
  label,
  href,
}: {
  icon: string;
  title: string;
  body: string;
  label: string;
  href: Href;
}) {
  return (
    <Card style={styles.addCard}>
      <EmptyState
        icon={icon}
        title={title}
        body={body}
        action={
          <Button
            label={label}
            icon="plus"
            variant="secondary"
            size="sm"
            onPress={() => router.push(href)}
          />
        }
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  section: { gap: spacing.md },
  tabular: { fontVariant: ['tabular-nums'] },
  addCard: { paddingVertical: 0 },
  sheetBody: { paddingHorizontal: spacing.gutter, gap: spacing.md },
});
