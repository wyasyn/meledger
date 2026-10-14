import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import type { Wallet } from '@/db/schema';
import { paletteColor, spacing } from '@/theme/tokens';

import { useHomeStore } from '../store';

/** Horizontal wallet chips; tapping one filters the transaction list. */
export function WalletStrip({ wallets }: { wallets: Wallet[] }) {
  const selected = useHomeStore((s) => s.walletId);
  const setWalletId = useHomeStore((s) => s.setWalletId);
  const active = wallets.filter((w) => !w.archived);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
      style={styles.bleed}
    >
      <Chip label="All" selected={selected === null} onPress={() => setWalletId(null)} />
      {active.map((wallet) => (
        <Chip
          key={wallet.id}
          label={wallet.name}
          icon={wallet.icon}
          iconColor={paletteColor(wallet.color)}
          selected={selected === wallet.id}
          onPress={() => setWalletId(selected === wallet.id ? null : wallet.id)}
        />
      ))}
      <Chip label="Wallets" icon="pencil" onPress={() => router.push('/wallets')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -spacing.gutter, flexGrow: 0 },
  // Vertical padding leaves room for the chips' press scale.
  strip: { gap: spacing.sm, paddingHorizontal: spacing.gutter, paddingVertical: 2 },
});
