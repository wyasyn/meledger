import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/IconButton';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import type { SheetRef } from '@/components/ui/Sheet';
import type { Goal } from '@/db/schema';
import { showSnackbar } from '@/features/feedback/snackbar';
import { GoalCard } from '@/features/plan/components/GoalCard';
import { MoneySheet } from '@/features/plan/components/MoneySheet';
import { goalProgress, savedByGoal } from '@/features/plan/logic';
import { addContribution, deleteGoal, restoreGoal } from '@/features/plan/repo';
import { usePlanData } from '@/features/plan/usePlanData';
import { lightColors, spacing } from '@/theme/tokens';

/** Every goal (View all on the Plan tab). */
export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const plan = usePlanData();
  const [target, setTarget] = useState<Goal | null>(null);
  const money = useRef<SheetRef>(null);
  if (!plan) return <LoadingScreen />;
  const saved = savedByGoal(plan.contributions);
  const now = new Date();

  return (
    <>
      <ScreenHeader
        title="Goals"
        right={
          <IconButton
            icon="plus"
            label="Add goal"
            variant="dark"
            onPress={() => router.push('/goals/new')}
          />
        }
      />
      <ScrollView
        style={styles.root}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
      >
        {plan.goals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            progress={goalProgress(goal, saved.get(goal.id) ?? 0, now)}
            onPress={() => router.push({ pathname: '/goals/[id]', params: { id: goal.id } })}
            onAction={async (action) => {
              if (action === 'add') {
                setTarget(goal);
                money.current?.present();
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
            }}
          />
        ))}
      </ScrollView>
      <MoneySheet
        ref={money}
        title={target ? `Add to ${target.name}` : 'Add money'}
        hint="Records money you've set aside for this goal."
        confirmLabel="Add"
        initialAmount={0}
        onSubmit={async ({ amount, occurredAt }) => {
          if (target) await addContribution(target.id, { amount, occurredAt });
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.background },
  content: { paddingHorizontal: spacing.gutter, gap: spacing.lg },
});
