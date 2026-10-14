import { formatAmount, formatMoney } from '@meledger/shared';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { Icon } from '@/components/ui/Icon';
import { type IconName, IconTile } from '@/components/ui/IconTile';
import type { Category, Tag, Transaction, Wallet } from '@/db/schema';
import { lightColors, paletteColor, radius, spacing } from '@/theme/tokens';

import { TagChip } from './TagChip';

interface TransactionRowProps {
  tx: Transaction;
  category: Category | undefined;
  wallet: Wallet | undefined;
  toWallet: Wallet | undefined;
  tags: Tag[];
  balanceAfter: number | undefined;
}

/** Home list row: icon tile, title, wallet and tag chips, signed amount and balance after. */
export function TransactionRow({
  tx,
  category,
  wallet,
  toWallet,
  tags,
  balanceAfter,
}: TransactionRowProps) {
  const transfer = tx.type === 'transfer';
  const walletLabel = transfer
    ? `${wallet?.name ?? '?'} → ${toWallet?.name ?? '?'}`
    : (wallet?.name ?? '');
  const title = tx.note ?? (transfer ? 'Transfer' : (category?.name ?? 'Uncategorised'));
  const sign = tx.type === 'income' ? '+' : '-';
  const amountColor =
    tx.type === 'income'
      ? lightColors.positive
      : tx.type === 'expense'
        ? lightColors.expense
        : lightColors.onSurface;
  const amountText = transfer
    ? formatAmount(tx.amount, 'UGX')
    : `${sign}${formatAmount(tx.amount, 'UGX')}`;
  const fee = transfer && tx.feeAmount > 0 ? `Fee ${formatAmount(tx.feeAmount, 'UGX')}` : null;
  const a11yLabel = [
    title,
    transfer
      ? `transfer of ${formatMoney(tx.amount, 'UGX')} from ${wallet?.name ?? 'unknown wallet'} to ${toWallet?.name ?? 'unknown wallet'}`
      : `${tx.type} of ${formatMoney(tx.amount, 'UGX')}, ${walletLabel}`,
    fee,
    tx.note && !transfer && category ? category.name : null,
    ...tags.map((tag) => tag.name),
    balanceAfter !== undefined ? `balance after ${formatMoney(balanceAfter, 'UGX')}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: tx.id } })}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint="Opens the entry to edit"
      android_ripple={{ color: lightColors.primaryContainer }}
      style={styles.row}
    >
      {transfer ? (
        <IconTile icon="swap-horizontal" color="slate" />
      ) : (
        <IconTile icon={category?.icon ?? 'shape-outline'} color={category?.color ?? 'slate'} />
      )}
      <View style={styles.middle}>
        <Text variant="titleSmall" numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <View style={styles.chips}>
          <View style={styles.walletChip}>
            <Icon
              name={(wallet?.icon ?? 'wallet-outline') as IconName}
              size={12}
              color={paletteColor(wallet?.color ?? 'slate')}
            />
            <Text variant="labelSmall" style={styles.muted} numberOfLines={1}>
              {walletLabel}
            </Text>
          </View>
          {fee ? (
            <Text variant="labelSmall" style={styles.muted} numberOfLines={1}>
              {fee}
            </Text>
          ) : null}
          {tx.note && !transfer && category ? (
            <Text variant="labelSmall" style={styles.muted} numberOfLines={1}>
              {category.name}
            </Text>
          ) : null}
          {tags.map((tag) => (
            <TagChip key={tag.id} tag={tag} small />
          ))}
        </View>
      </View>
      <View style={styles.right}>
        <Text variant="titleSmall" style={[styles.amount, { color: amountColor }]}>
          {amountText}
        </Text>
        {balanceAfter !== undefined ? (
          <Text variant="labelSmall" style={styles.muted}>
            {formatAmount(balanceAfter, 'UGX')}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: lightColors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: lightColors.outline,
    overflow: 'hidden',
  },
  middle: { flex: 1, gap: spacing.xs },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs + 2 },
  walletChip: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 180 },
  muted: { color: lightColors.onSurfaceVariant },
  right: { alignItems: 'flex-end', gap: 2 },
  amount: { fontFamily: 'Inter_600SemiBold' },
});
