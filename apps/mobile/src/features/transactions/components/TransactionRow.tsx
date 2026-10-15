import { formatAmount, formatMoney } from '@meledger/shared';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import type { Category, Tag, Transaction, Wallet } from '@/db/schema';
import { openEntrySheet } from '@/features/voice/store';
import { lightColors, paletteColor, radius, shadow, spacing } from '@/theme/tokens';

import { TagChip } from './TagChip';
import { MASK } from '@/features/security/balances';

interface TransactionRowProps {
  tx: Transaction;
  category: Category | undefined;
  wallet: Wallet | undefined;
  toWallet: Wallet | undefined;
  tags: Tag[];
  balanceAfter: number | undefined;
  /** Home with Hide balances on: amounts show as dots. */
  hideAmounts?: boolean;
}

/** Home list row: icon tile, title, wallet and tag chips, signed amount and balance after. */
export function TransactionRow({
  tx,
  category,
  wallet,
  toWallet,
  tags,
  balanceAfter,
  hideAmounts = false,
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
  const amountText = hideAmounts
    ? MASK
    : transfer
      ? formatAmount(tx.amount, 'UGX')
      : `${sign}${formatAmount(tx.amount, 'UGX')}`;
  const fee =
    transfer && tx.feeAmount > 0 && !hideAmounts
      ? `Fee ${formatAmount(tx.feeAmount, 'UGX')}`
      : null;
  const a11yLabel = [
    title,
    transfer
      ? `transfer of ${hideAmounts ? 'hidden amount' : formatMoney(tx.amount, 'UGX')} from ${wallet?.name ?? 'unknown wallet'} to ${toWallet?.name ?? 'unknown wallet'}`
      : `${tx.type} of ${hideAmounts ? 'hidden amount' : formatMoney(tx.amount, 'UGX')}, ${walletLabel}`,
    fee,
    tx.note && !transfer && category ? category.name : null,
    ...tags.map((tag) => tag.name),
    balanceAfter !== undefined && !hideAmounts
      ? `balance after ${formatMoney(balanceAfter, 'UGX')}`
      : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <PressableScale
      onPress={() => openEntrySheet(tx.id)}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint="Opens the entry to edit"
      style={styles.row}
    >
      {transfer ? (
        <IconTile icon="transfer" color="slate" />
      ) : (
        <IconTile icon={category?.icon ?? 'category'} color={category?.color ?? 'slate'} />
      )}
      <View style={styles.middle}>
        <Text variant="subtitle" numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.chips}>
          <View style={styles.walletChip}>
            <Icon
              name={wallet?.icon ?? 'wallet'}
              size={13}
              color={paletteColor(wallet?.color ?? 'slate')}
            />
            <Text variant="small" tone="muted" numberOfLines={1}>
              {walletLabel}
            </Text>
          </View>
          {fee ? (
            <Text variant="small" tone="muted" numberOfLines={1}>
              {fee}
            </Text>
          ) : null}
          {tx.note && !transfer && category ? (
            <Text variant="small" tone="muted" numberOfLines={1}>
              {category.name}
            </Text>
          ) : null}
          {tags.map((tag) => (
            <TagChip key={tag.id} tag={tag} small />
          ))}
        </View>
      </View>
      <View style={styles.right}>
        <Text variant="bodyStrong" color={amountColor} style={styles.tabular}>
          {amountText}
        </Text>
        {balanceAfter !== undefined ? (
          <Text variant="small" tone="muted" style={styles.tabular}>
            {hideAmounts ? MASK : formatAmount(balanceAfter, 'UGX')}
          </Text>
        ) : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md + 2,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: lightColors.surface,
    borderRadius: radius.card - 4,
    boxShadow: shadow.card,
  },
  middle: { flex: 1, gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  walletChip: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 180 },
  right: { alignItems: 'flex-end', gap: 2 },
  tabular: { fontVariant: ['tabular-nums'] },
});
