import { router } from 'expo-router';

import { WalletForm } from '@/features/wallets/components/WalletForm';
import { createWallet } from '@/features/wallets/repo';

export default function NewWalletScreen() {
  return (
    <WalletForm
      title="New wallet"
      initial={{
        name: '',
        type: 'mobile_money',
        provider: null,
        currency: 'UGX',
        openingBalance: 0,
        color: 'amber',
      }}
      onSubmit={async (values) => {
        await createWallet(values);
        router.back();
      }}
    />
  );
}
