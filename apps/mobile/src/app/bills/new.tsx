import { addMonths, startOfDay } from 'date-fns';
import { router } from 'expo-router';

import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { BillForm } from '@/features/plan/components/BillForm';
import { createRecurring } from '@/features/plan/repo';
import { useLedgerData } from '@/features/transactions/useLedgerData';
import { mainWalletId } from '@/features/wallets/logic';

export default function NewBillScreen() {
  const data = useLedgerData();
  if (!data) return <LoadingScreen />;
  return (
    <BillForm
      title="New recurring bill"
      autoFocus
      categories={data.categories}
      wallets={data.wallets}
      initial={{
        name: '',
        type: 'expense',
        amount: 0,
        walletId: mainWalletId(data.wallets) ?? '',
        categoryId: null,
        frequency: 'monthly',
        nextDueAt: addMonths(startOfDay(new Date()), 1),
      }}
      onSubmit={async (values) => {
        await createRecurring(values);
        router.back();
      }}
    />
  );
}
