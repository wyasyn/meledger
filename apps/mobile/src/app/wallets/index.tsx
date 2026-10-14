import { formatMoney } from '@meledger/shared';
import { Link, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconTile } from '@/components/ui/IconTile';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import type { Wallet } from '@/db/schema';
import { useLedger, useLedgerData } from '@/features/transactions/useLedgerData';
import { mainWalletId, WALLET_TYPE_META } from '@/features/wallets/logic';
import { lightColors, radius, spacing } from '@/theme/tokens';

export default function WalletsScreen() {
  const insets = useSafeAreaInsets();
  const data = useLedgerData();
  const ledger = useLedger(data);
  if (!data || !ledger) return <LoadingScreen />;

  const mainId = mainWalletId(data.wallets);
  const active = data.wallets.filter((w) => !w.archived);
  const archived = data.wallets.filter((w) => w.archived);

  const row = (wallet: Wallet) => (
    <Pressable
      key={wallet.id}
      onPress={() => router.push({ pathname: '/wallets/[id]', params: { id: wallet.id } })}
      accessibilityRole="button"
      android_ripple={{ color: lightColors.primaryContainer }}
      style={styles.row}
    >
      <IconTile icon={wallet.icon} color={wallet.color} />
      <View style={styles.flex}>
        <Text variant="titleMedium">{wallet.name}</Text>
        <Text variant="bodySmall" style={styles.muted}>
          {wallet.id === mainId ? 'Main wallet' : WALLET_TYPE_META[wallet.type].label}
          {wallet.provider ? ` · ${wallet.provider}` : ''}
        </Text>
      </View>
      <Text variant="titleSmall">{formatMoney(ledger.balances.get(wallet.id) ?? 0, 'UGX')}</Text>
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Wallets"
        right={
          <Link href="/wallets/new" asChild>
            <IconButton
              icon="plus"
              mode="contained"
              containerColor={lightColors.insightBar}
              iconColor={lightColors.onPrimary}
              accessibilityLabel="Add wallet"
            />
          </Link>
        }
      />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.group}>{active.map(row)}</View>
        {archived.length > 0 ? (
          <>
            <Text variant="labelMedium" style={[styles.muted, styles.heading]}>
              Archived
            </Text>
            <View style={styles.group}>{archived.map(row)}</View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.background },
  content: { padding: spacing.lg, gap: spacing.sm },
  group: {
    backgroundColor: lightColors.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  flex: { flex: 1 },
  muted: { color: lightColors.onSurfaceVariant },
  heading: { marginTop: spacing.md },
});
