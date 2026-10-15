import { router, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { showSnackbar } from '@/features/feedback/snackbar';
import { BillForm } from '@/features/plan/components/BillForm';
import { parseTemplate } from '@/features/plan/logic';
import { deleteRecurring, restoreRecurring, updateRecurring } from '@/features/plan/repo';
import { usePlanData } from '@/features/plan/usePlanData';
import { useLedgerData } from '@/features/transactions/useLedgerData';

export default function EditBillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plan = usePlanData();
  const data = useLedgerData();
  if (!plan || !data) return <LoadingScreen />;
  const rule = plan.recurring.find((r) => r.id === id);
  if (!rule) {
    return (
      <>
        <ScreenHeader title="Bill" />
        <EmptyState icon="repeat" title="This bill no longer exists" />
      </>
    );
  }
  const t = parseTemplate(rule.template);
  return (
    <BillForm
      title="Edit bill"
      categories={data.categories}
      wallets={data.wallets}
      initial={{
        name: rule.name,
        type: t?.type ?? 'expense',
        amount: t?.amount ?? 0,
        walletId: t?.walletId ?? '',
        categoryId: t?.categoryId ?? null,
        frequency: rule.frequency,
        nextDueAt: rule.nextDueAt,
      }}
      onSubmit={async (values) => {
        await updateRecurring(rule.id, values);
        router.back();
      }}
    >
      <Button
        label="Delete bill"
        icon="trash"
        variant="danger"
        block
        onPress={async () => {
          await deleteRecurring(rule.id);
          router.back();
          showSnackbar({
            message: `Deleted ${rule.name}`,
            duration: 5000,
            action: { label: 'Undo', onPress: () => void restoreRecurring(rule.id) },
          });
        }}
      />
    </BillForm>
  );
}
