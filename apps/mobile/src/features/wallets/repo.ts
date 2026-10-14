import type { WalletInput } from '@meledger/shared';
import { and, asc, eq, isNull, max, or } from 'drizzle-orm';

import { db } from '@/db/client';
import { created, newId } from '@/db/ids';
import { transactions, wallets } from '@/db/schema';

import { WALLET_TYPE_META } from './logic';

const active = isNull(wallets.deletedAt);

export async function createWallet(input: WalletInput): Promise<string> {
  const [{ value }] = await db
    .select({ value: max(wallets.sort) })
    .from(wallets)
    .where(active);
  const id = newId();
  await db.insert(wallets).values({
    id,
    ...created(),
    ...input,
    icon: WALLET_TYPE_META[input.type].icon,
    sort: (value ?? -1) + 1,
  });
  return id;
}

export async function updateWallet(id: string, input: WalletInput): Promise<void> {
  await db
    .update(wallets)
    .set({ ...input, icon: WALLET_TYPE_META[input.type].icon, updatedAt: new Date() })
    .where(eq(wallets.id, id));
}

/** Moves the wallet to the top of the list, which makes it the main wallet. */
export async function setMainWallet(id: string): Promise<void> {
  const rows = await db
    .select({ id: wallets.id })
    .from(wallets)
    .where(active)
    .orderBy(asc(wallets.sort), asc(wallets.createdAt));
  const ordered = [id, ...rows.map((r) => r.id).filter((other) => other !== id)];
  const now = new Date();
  db.transaction((tx) => {
    ordered.forEach((walletId, sort) => {
      tx.update(wallets).set({ sort, updatedAt: now }).where(eq(wallets.id, walletId)).run();
    });
  });
}

export async function setWalletArchived(id: string, archived: boolean): Promise<void> {
  await db.update(wallets).set({ archived, updatedAt: new Date() }).where(eq(wallets.id, id));
}

export async function walletHasTransactions(id: string): Promise<boolean> {
  const row = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        isNull(transactions.deletedAt),
        or(eq(transactions.walletId, id), eq(transactions.toWalletId, id)),
      ),
    )
    .limit(1);
  return row.length > 0;
}

/** Soft delete. Only allowed for wallets without entries; archive the others instead. */
export async function deleteWallet(id: string): Promise<void> {
  if (await walletHasTransactions(id)) {
    throw new Error('This wallet has entries. Archive it instead.');
  }
  const now = new Date();
  await db.update(wallets).set({ deletedAt: now, updatedAt: now }).where(eq(wallets.id, id));
}
