import { formatMoney } from '@meledger/shared';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/IconButton';
import { ListGroup, ListRow } from '@/components/ui/ListGroup';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import type { Wallet } from '@/db/schema';
import { useLedger, useLedgerData } from '@/features/transactions/useLedgerData';
import { mainWalletId, WALLET_TYPE_META } from '@/features/wallets/logic';
import { lightColors, radius, shadow, spacing } from '@/theme/tokens';

export default function WalletsScreen() {
  const insets = useSafeAreaInsets();
  const data = useLedgerData();
  const ledger = useLedger(data);
  if (!data || !ledger) return <LoadingScreen />;

  const mainId = mainWalletId(data.wallets);
  const active = data.wallets.filter((w) => !w.archived);
  const archived = data.wallets.filter((w) => w.archived);
  const total = active.reduce((sum, w) => sum + (ledger.balances.get(w.id) ?? 0), 0);

  const row = (wallet: Wallet) => (
    <ListRow
      key={wallet.id}
      title={wallet.name}
      subtitle={[
        wallet.id === mainId ? 'Main wallet' : WALLET_TYPE_META[wallet.type].label,
        wallet.provider,
      ]
        .filter(Boolean)
        .join(' · ')}
      icon={wallet.icon}
      iconColor={wallet.color}
      value={formatMoney(ledger.balances.get(wallet.id) ?? 0, 'UGX')}
      onPress={() => router.push({ pathname: '/wallets/[id]', params: { id: wallet.id } })}
    />
  );

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Wallets"
        right={
          <IconButton
            icon="plus"
            label="Add wallet"
            variant="dark"
            onPress={() => router.push('/wallets/new')}
          />
        }
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
      >
        <View style={styles.total} accessible>
          <Text variant="caption" tone="muted">
            Total in active wallets
          </Text>
          <Text variant="amount">{formatMoney(total, 'UGX')}</Text>
        </View>
        <ListGroup title="Active">{active.map(row)}</ListGroup>
        {archived.length > 0 ? <ListGroup title="Archived">{archived.map(row)}</ListGroup> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.background },
  content: { paddingHorizontal: spacing.gutter, gap: spacing.xxl },
  total: {
    gap: spacing.xs,
    padding: spacing.xl,
    borderRadius: radius.card,
    backgroundColor: lightColors.surface,
    boxShadow: shadow.card,
  },
});
