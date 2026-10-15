import { router } from 'expo-router';

import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { DebtForm } from '@/features/plan/components/DebtForm';
import { createDebt } from '@/features/plan/repo';
import { usePlanData } from '@/features/plan/usePlanData';
import { useLedgerData } from '@/features/transactions/useLedgerData';
import { mainWalletId } from '@/features/wallets/logic';

export default function NewDebtScreen() {
  const data = useLedgerData();
  const plan = usePlanData();
  if (!data || !plan) return <LoadingScreen />;
  return (
    <DebtForm
      title="New debt or loan"
      autoFocus
      people={[...new Set(plan.debts.map((d) => d.person))]}
      wallets={data.wallets}
      initial={{
        person: '',
        direction: 'owed_to_me',
        principal: 0,
        startedAt: new Date(),
        dueAt: null,
        note: '',
        walletId: mainWalletId(data.wallets),
      }}
      onSubmit={async (values) => {
        await createDebt(values);
        router.back();
      }}
    />
  );
}
