import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import type { Wallet } from '@/db/schema';
import { useLedgerData } from '@/features/transactions/useLedgerData';
import { WalletForm } from '@/features/wallets/components/WalletForm';
import { asColorKey, mainWalletId } from '@/features/wallets/logic';
import {
  deleteWallet,
  setMainWallet,
  setWalletArchived,
  updateWallet,
  walletHasTransactions,
} from '@/features/wallets/repo';
import { spacing } from '@/theme/tokens';

export default function EditWalletScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useLedgerData();
  if (!data) return <LoadingScreen />;
  const wallet = data.wallets.find((w) => w.id === id);
  if (!wallet) {
    return (
      <>
        <ScreenHeader title="Wallet" />
        <EmptyState icon="wallet" title="This wallet no longer exists" />
      </>
    );
  }
  const activeCount = data.wallets.filter((w) => !w.archived).length;
  return (
    <EditWallet
      wallet={wallet}
      isMain={mainWalletId(data.wallets) === wallet.id}
      isLastActive={!wallet.archived && activeCount === 1}
    />
  );
}

interface EditWalletProps {
  wallet: Wallet;
  isMain: boolean;
  isLastActive: boolean;
}

function EditWallet({ wallet, isMain, isLastActive }: EditWalletProps) {
  const [error, setError] = useState<string>();
  const [initial] = useState(() => ({
    name: wallet.name,
    type: wallet.type,
    provider: wallet.provider,
    currency: 'UGX' as const,
    openingBalance: wallet.openingBalance,
    color: asColorKey(wallet.color),
  }));

  const remove = async () => {
    if (await walletHasTransactions(wallet.id)) {
      setError('This wallet has entries, so it can only be archived.');
      return;
    }
    await deleteWallet(wallet.id);
    router.back();
  };

  return (
    <WalletForm
      title="Edit wallet"
      editing
      initial={initial}
      onSubmit={async (values) => {
        await updateWallet(wallet.id, values);
        router.back();
      }}
      footer={
        <View style={styles.footer}>
          {!isMain && !wallet.archived ? (
            <Button
              label="Make main wallet"
              icon="star"
              variant="secondary"
              block
              onPress={() => setMainWallet(wallet.id)}
            />
          ) : null}
          <Button
            label={wallet.archived ? 'Unarchive' : 'Archive'}
            icon={wallet.archived ? 'restore' : 'archive'}
            variant="secondary"
            block
            disabled={isLastActive}
            onPress={() => setWalletArchived(wallet.id, !wallet.archived)}
          />
          <Button
            label="Delete wallet"
            icon="trash"
            variant="danger"
            block
            disabled={isLastActive}
            onPress={remove}
          />
          {isLastActive ? (
            <Text variant="small" tone="muted" align="center">
              You need at least one active wallet.
            </Text>
          ) : null}
          {error ? (
            <Text variant="small" tone="expense" align="center">
              {error}
            </Text>
          ) : null}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  footer: { gap: spacing.sm },
});
