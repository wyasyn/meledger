import { computeLedger, type LedgerTransaction } from '@meledger/shared';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { useMemo } from 'react';

import { db } from '@/db/client';
import {
  type Category,
  categories,
  type Tag,
  tags,
  type Transaction,
  transactions,
  transactionTags,
  type Wallet,
  wallets,
} from '@/db/schema';
import { useLiveData } from '@/db/useLiveData';

export interface LedgerData {
  /** Not deleted, ordered by sort (first active = main wallet). Includes archived ones. */
  wallets: Wallet[];
  categories: Category[];
  tags: Tag[];
  /** Not deleted, newest first. */
  transactions: Transaction[];
  tagIdsByTransaction: Map<string, string[]>;
  /** When this snapshot was read; "now" for time-relative figures like change vs last week. */
  loadedAt: number;
}

async function loadLedger(): Promise<LedgerData> {
  const [walletRows, categoryRows, tagRows, txRows, links] = await Promise.all([
    db
      .select()
      .from(wallets)
      .where(isNull(wallets.deletedAt))
      .orderBy(asc(wallets.sort), asc(wallets.createdAt)),
    db
      .select()
      .from(categories)
      .where(and(isNull(categories.deletedAt), eq(categories.hidden, false)))
      .orderBy(asc(categories.sort), asc(categories.name)),
    db.select().from(tags).where(isNull(tags.deletedAt)).orderBy(asc(tags.name)),
    db
      .select()
      .from(transactions)
      .where(isNull(transactions.deletedAt))
      .orderBy(desc(transactions.occurredAt), desc(transactions.createdAt)),
    db
      .select({ transactionId: transactionTags.transactionId, tagId: transactionTags.tagId })
      .from(transactionTags)
      .where(isNull(transactionTags.deletedAt)),
  ]);

  const tagIdsByTransaction = new Map<string, string[]>();
  for (const { transactionId, tagId } of links) {
    const list = tagIdsByTransaction.get(transactionId);
    if (list) list.push(tagId);
    else tagIdsByTransaction.set(transactionId, [tagId]);
  }

  return {
    wallets: walletRows,
    categories: categoryRows,
    tags: tagRows,
    transactions: txRows,
    tagIdsByTransaction,
    loadedAt: Date.now(),
  };
}

const TABLES = ['wallets', 'categories', 'tags', 'transactions', 'transaction_tags'] as const;

/** Everything Home and the entry form read, kept live as the database changes. */
export function useLedgerData(): LedgerData | undefined {
  return useLiveData(loadLedger, TABLES, []);
}

/** Drizzle row to the plain shape the shared ledger functions take. */
export function toLedgerTransaction(tx: Transaction): LedgerTransaction {
  return {
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    feeAmount: tx.feeAmount,
    walletId: tx.walletId,
    toWalletId: tx.toWalletId,
    occurredAt: tx.occurredAt.getTime(),
    createdAt: tx.createdAt.getTime(),
  };
}

/** Balances for the loaded data, recomputed only when the data changes. */
export function useLedger(data: LedgerData | undefined) {
  return useMemo(() => {
    if (!data) return undefined;
    const entries = data.transactions.map(toLedgerTransaction);
    return { entries, ...computeLedger(data.wallets, entries) };
  }, [data]);
}
