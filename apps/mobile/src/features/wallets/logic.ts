import { CATEGORY_COLORS, type CategoryColor, type WalletType } from '@meledger/shared';

import type { IconName } from '@/components/ui/IconTile';

export const WALLET_TYPE_META: Record<
  WalletType,
  { label: string; icon: IconName; color: CategoryColor }
> = {
  cash: { label: 'Cash', icon: 'cash', color: 'green' },
  mobile_money: { label: 'Mobile money', icon: 'cellphone', color: 'amber' },
  bank: { label: 'Bank', icon: 'bank', color: 'blue' },
  card: { label: 'Card', icon: 'credit-card-outline', color: 'lime' },
  savings: { label: 'Savings', icon: 'piggy-bank', color: 'teal' },
};

/** Wallets are ordered by `sort`; the first active one is the main wallet. */
export function mainWalletId<W extends { id: string; archived: boolean }>(
  sorted: readonly W[],
): string | null {
  return sorted.find((w) => !w.archived)?.id ?? null;
}

/** Stored colour as a palette key, falling back to slate for unknown values. */
export const asColorKey = (value: string): CategoryColor =>
  value in CATEGORY_COLORS ? (value as CategoryColor) : 'slate';
