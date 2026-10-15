import { router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { showSnackbar } from '@/features/feedback/snackbar';
import { BudgetForm } from '@/features/plan/components/BudgetForm';
import { deleteBudget, restoreBudget, updateBudget } from '@/features/plan/repo';
import { usePlanData } from '@/features/plan/usePlanData';
import { useLedgerData } from '@/features/transactions/useLedgerData';

export default function EditBudgetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plan = usePlanData();
  const data = useLedgerData();
  if (!plan || !data) return <LoadingScreen />;
  const budget = plan.budgets.find((b) => b.id === id);
  if (!budget) {
    return (
      <>
        <ScreenHeader title="Budget" />
        <EmptyState icon="report" title="This budget no longer exists" />
      </>
    );
  }
  return (
    <BudgetForm
      title="Edit budget"
      categories={data.categories}
      initial={{
        categoryId: budget.categoryId,
        period: budget.period,
        limitAmount: budget.limitAmount,
        alertAt: budget.alertAt,
        startsAt: budget.startsAt,
        endsAt: budget.endsAt,
      }}
      onSubmit={async (values) => {
        await updateBudget(budget.id, values);
        router.back();
      }}
    >
      <Button
        label="Delete budget"
        icon="trash"
        variant="danger"
        block
        onPress={async () => {
          await deleteBudget(budget.id);
          router.back();
          showSnackbar({
            message: 'Budget deleted',
            duration: 5000,
            action: { label: 'Undo', onPress: () => void restoreBudget(budget.id) },
          });
        }}
      />
    </BudgetForm>
  );
}
