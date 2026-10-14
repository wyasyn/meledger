import type { TransactionInput } from '@meledger/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { showSnackbar } from '@/features/feedback/snackbar';
import { TransactionForm } from '@/features/transactions/components/TransactionForm';
import { createTransaction } from '@/features/transactions/repo';
import { type LedgerData, useLedgerData } from '@/features/transactions/useLedgerData';
import { mainWalletId } from '@/features/wallets/logic';

export default function NewTransactionScreen() {
  const data = useLedgerData();
  if (!data) return <LoadingScreen />;
  return <NewTransactionForm data={data} />;
}

function NewTransactionForm({ data }: { data: LedgerData }) {
  // The voice screen hands over what was said as the note until speech parsing lands.
  const { note } = useLocalSearchParams<{ note?: string }>();
  const [initial] = useState<TransactionInput>(() => ({
    type: 'expense',
    amount: 0,
    walletId: mainWalletId(data.wallets) ?? '',
    toWalletId: null,
    categoryId: null,
    occurredAt: new Date(),
    note: note?.slice(0, 200) ?? '',
    feeAmount: 0,
    tagIds: [],
  }));

  return (
    <TransactionForm
      title="Add New"
      data={data}
      initial={initial}
      onSubmit={async (values) => {
        await createTransaction(values);
        showSnackbar({ message: 'Entry saved' });
        router.back();
      }}
    />
  );
}
