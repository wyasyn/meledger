import { router } from 'expo-router';

import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { BudgetForm } from '@/features/plan/components/BudgetForm';
import { createBudget } from '@/features/plan/repo';
import { useLedgerData } from '@/features/transactions/useLedgerData';

export default function NewBudgetScreen() {
  const data = useLedgerData();
  if (!data) return <LoadingScreen />;
  return (
    <BudgetForm
      title="New budget"
      categories={data.categories}
      initial={{
        categoryId: '',
        period: 'monthly',
        limitAmount: 0,
        alertAt: 80,
        startsAt: null,
        endsAt: null,
      }}
      onSubmit={async (values) => {
        await createBudget(values);
        router.back();
      }}
    />
  );
}
