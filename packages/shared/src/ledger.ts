import type { TransactionType } from './schemas';

/** The fields of a transaction that affect balances. Times are epoch milliseconds. */
export interface LedgerTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  feeAmount: number;
  walletId: string;
  toWalletId: string | null;
  occurredAt: number;
  createdAt: number;
}

export interface LedgerWallet {
  id: string;
  openingBalance: number;
}

/**
 * How a transaction changes each wallet it touches. A transfer takes the amount plus its fee
 * from the source wallet and adds the amount to the destination wallet.
 */
export function walletDeltas(tx: LedgerTransaction): [walletId: string, delta: number][] {
  switch (tx.type) {
    case 'income':
      return [[tx.walletId, tx.amount]];
    case 'expense':
      return [[tx.walletId, -tx.amount]];
    case 'transfer':
      return tx.toWalletId
        ? [
            [tx.walletId, -(tx.amount + tx.feeAmount)],
            [tx.toWalletId, tx.amount],
          ]
        : [[tx.walletId, -(tx.amount + tx.feeAmount)]];
  }
}

const chronological = (a: LedgerTransaction, b: LedgerTransaction) =>
  a.occurredAt - b.occurredAt || a.createdAt - b.createdAt || a.id.localeCompare(b.id);

export interface Ledger {
  /** Current balance per wallet id. */
  balances: Map<string, number>;
  /** Balance of the transaction's own (source) wallet right after it, keyed by transaction id. */
  balanceAfter: Map<string, number>;
}

/** Replays every transaction in time order on top of the wallets' opening balances. */
export function computeLedger(
  wallets: readonly LedgerWallet[],
  transactions: readonly LedgerTransaction[],
): Ledger {
  const balances = new Map(wallets.map((w) => [w.id, w.openingBalance]));
  const balanceAfter = new Map<string, number>();
  for (const tx of [...transactions].sort(chronological)) {
    for (const [walletId, delta] of walletDeltas(tx)) {
      balances.set(walletId, (balances.get(walletId) ?? 0) + delta);
    }
    balanceAfter.set(tx.id, balances.get(tx.walletId) ?? 0);
  }
  return { balances, balanceAfter };
}

/** Sum of all wallet balances, counting only transactions that happened before `at`. */
export function totalBalanceAt(
  wallets: readonly LedgerWallet[],
  transactions: readonly LedgerTransaction[],
  at: number,
): number {
  let total = wallets.reduce((sum, w) => sum + w.openingBalance, 0);
  for (const tx of transactions) {
    if (tx.occurredAt >= at) continue;
    for (const [, delta] of walletDeltas(tx)) total += delta;
  }
  return total;
}

export interface PeriodTotals {
  income: number;
  /** Expenses plus transfer fees: money that left the user's wallets. */
  expense: number;
}

/** Income and spending for transactions with `from <= occurredAt < to`. */
export function periodTotals(
  transactions: readonly LedgerTransaction[],
  from: number,
  to: number,
): PeriodTotals {
  const totals: PeriodTotals = { income: 0, expense: 0 };
  for (const tx of transactions) {
    if (tx.occurredAt < from || tx.occurredAt >= to) continue;
    if (tx.type === 'income') totals.income += tx.amount;
    else if (tx.type === 'expense') totals.expense += tx.amount;
    else totals.expense += tx.feeAmount;
  }
  return totals;
}
