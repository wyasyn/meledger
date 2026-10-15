import { router } from 'expo-router';

import { GoalForm } from '@/features/plan/components/GoalForm';
import { createGoal } from '@/features/plan/repo';

export default function NewGoalScreen() {
  return (
    <GoalForm
      title="New goal"
      autoFocus
      initial={{ name: '', icon: 'piggy-bank', color: 'teal', targetAmount: 0, targetDate: null }}
      onSubmit={async (values) => {
        await createGoal(values);
        router.back();
      }}
    />
  );
}
