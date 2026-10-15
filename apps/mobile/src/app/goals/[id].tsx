import { formatMoney, type GoalInput } from '@meledger/shared';
import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { ListGroup, ListRow } from '@/components/ui/ListGroup';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import type { SheetRef } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import type { Goal } from '@/db/schema';
import { showSnackbar } from '@/features/feedback/snackbar';
import { GoalForm } from '@/features/plan/components/GoalForm';
import { MoneySheet } from '@/features/plan/components/MoneySheet';
import { asColorKey } from '@/features/wallets/logic';
import { goalProgress } from '@/features/plan/logic';
import {
  addContribution,
  deleteContribution,
  deleteGoal,
  restoreGoal,
  updateGoal,
} from '@/features/plan/repo';
import { usePlanData } from '@/features/plan/usePlanData';
import { spacing } from '@/theme/tokens';

export default function EditGoalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plan = usePlanData();
  if (!plan) return <LoadingScreen />;
  const goal = plan.goals.find((g) => g.id === id);
  if (!goal) {
    return (
      <>
        <ScreenHeader title="Goal" />
        <EmptyState icon="target" title="This goal no longer exists" />
      </>
    );
  }
  return <EditGoal goal={goal} contributions={plan.contributions.filter((c) => c.goalId === id)} />;
}

function EditGoal({
  goal,
  contributions,
}: {
  goal: Goal;
  contributions: { id: string; amount: number; occurredAt: Date }[];
}) {
  const money = useRef<SheetRef>(null);
  const [initial] = useState<GoalInput>(() => ({
    name: goal.name,
    icon: goal.icon,
    color: asColorKey(goal.color),
    targetAmount: goal.targetAmount,
    targetDate: goal.targetDate,
  }));
  const saved = contributions.reduce((sum, c) => sum + c.amount, 0);
  const progress = goalProgress(goal, saved, new Date());

  const remove = async () => {
    await deleteGoal(goal.id);
    router.back();
    showSnackbar({
      message: `Deleted ${goal.name}`,
      duration: 5000,
      action: { label: 'Undo', onPress: () => void restoreGoal(goal.id) },
    });
  };

  return (
    <>
      <GoalForm
        title="Edit goal"
        initial={initial}
        onSubmit={async (values) => {
          await updateGoal(goal.id, values);
          router.back();
        }}
      >
        <View style={styles.section}>
          <View style={styles.row}>
            <Text variant="title" style={styles.flex}>
              Saved so far
            </Text>
            <Button
              label="Add money"
              icon="plus"
              size="sm"
              variant="secondary"
              onPress={() => money.current?.present()}
            />
          </View>
          <Text variant="caption" tone="muted">
            {formatMoney(saved)} of {formatMoney(goal.targetAmount)} ·{' '}
            {Math.round(progress.ratio * 100)}%
          </Text>
          {contributions.length > 0 ? (
            <ListGroup>
              {[...contributions].reverse().map((c) => (
                <ListRow
                  key={c.id}
                  title={formatMoney(c.amount)}
                  subtitle={format(c.occurredAt, 'EEE d MMM yyyy')}
                  trailing={
                    <IconButton
                      icon="trash"
                      label={`Remove ${formatMoney(c.amount)} from ${format(c.occurredAt, 'd MMM')}`}
                      size={36}
                      onPress={() => deleteContribution(c.id)}
                    />
                  }
                />
              ))}
            </ListGroup>
          ) : null}
        </View>
        <Button label="Delete goal" icon="trash" variant="danger" block onPress={remove} />
      </GoalForm>
      <MoneySheet
        ref={money}
        title={`Add to ${goal.name}`}
        hint="Records money you've set aside for this goal."
        confirmLabel="Add"
        initialAmount={0}
        onSubmit={async ({ amount, occurredAt }) => {
          await addContribution(goal.id, { amount, occurredAt });
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm, marginTop: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
