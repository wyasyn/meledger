import { router, useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { DebtForm } from '@/features/plan/components/DebtForm';
import { updateDebt } from '@/features/plan/repo';
import { usePlanData } from '@/features/plan/usePlanData';

export default function EditDebtScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plan = usePlanData();
  if (!plan) return <LoadingScreen />;
  const debt = plan.debts.find((d) => d.id === id);
  if (!debt) {
    return (
      <>
        <ScreenHeader title="Debt" />
        <EmptyState icon="debt" title="This debt no longer exists" />
      </>
    );
  }
  return (
    <DebtForm
      title="Edit debt"
      people={[...new Set(plan.debts.map((d) => d.person))]}
      initial={{
        person: debt.person,
        direction: debt.direction,
        principal: debt.principal,
        startedAt: debt.startedAt ?? debt.createdAt,
        dueAt: debt.dueAt,
        note: debt.note ?? '',
        walletId: null,
      }}
      onSubmit={async ({ walletId: _unused, ...values }) => {
        await updateDebt(debt.id, values);
        router.back();
      }}
    />
  );
}
