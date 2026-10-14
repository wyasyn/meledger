import type { TransactionInput } from '@meledger/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import type { Transaction } from '@/db/schema';
import { showSnackbar } from '@/features/feedback/snackbar';
import { TransactionForm } from '@/features/transactions/components/TransactionForm';
import {
  deleteTransaction,
  restoreTransaction,
  updateTransaction,
} from '@/features/transactions/repo';
import { type LedgerData, useLedgerData } from '@/features/transactions/useLedgerData';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useLedgerData();
  if (!data) return <LoadingScreen />;
  const tx = data.transactions.find((t) => t.id === id);
  if (!tx) {
    return (
      <>
        <ScreenHeader title="Edit entry" />
        <EmptyState icon="file-question-outline" title="This entry no longer exists" />
      </>
    );
  }
  return <EditTransactionForm data={data} tx={tx} />;
}

function EditTransactionForm({ data, tx }: { data: LedgerData; tx: Transaction }) {
  const [initial] = useState<TransactionInput>(() => ({
    type: tx.type,
    amount: tx.amount,
    walletId: tx.walletId,
    toWalletId: tx.toWalletId,
    categoryId: tx.categoryId,
    occurredAt: tx.occurredAt,
    note: tx.note ?? '',
    feeAmount: tx.feeAmount,
    tagIds: data.tagIdsByTransaction.get(tx.id) ?? [],
  }));

  return (
    <TransactionForm
      title="Edit entry"
      data={data}
      initial={initial}
      onSubmit={async (values) => {
        await updateTransaction(tx.id, values);
        showSnackbar({ message: 'Entry updated' });
        router.back();
      }}
      onDelete={async () => {
        await deleteTransaction(tx.id);
        router.back();
        showSnackbar({
          message: 'Entry deleted',
          duration: 5000,
          action: { label: 'Undo', onPress: () => void restoreTransaction(tx.id) },
        });
      }}
    />
  );
}
