import type { TransactionInput, TransactionSource } from '@meledger/shared';
import { and, eq, inArray, isNull, not } from 'drizzle-orm';

import { db } from '@/db/client';
import { created, newId } from '@/db/ids';
import { transactions, transactionTags } from '@/db/schema';

/** Columns written from the form; transfer-only and category fields are cleared when unused. */
function columns(input: TransactionInput) {
  const transfer = input.type === 'transfer';
  return {
    type: input.type,
    amount: input.amount,
    currency: 'UGX',
    walletId: input.walletId,
    toWalletId: transfer ? input.toWalletId : null,
    categoryId: transfer ? null : input.categoryId,
    occurredAt: input.occurredAt,
    note: input.note.trim() || null,
    feeAmount: transfer ? input.feeAmount : 0,
  };
}

/** For entries made by voice: what was said and how sure the parser was (0 to 1). */
export interface VoiceMeta {
  transcript: string;
  confidence: number;
}

export async function createTransaction(
  input: TransactionInput,
  source: TransactionSource = 'keyboard',
  voice?: VoiceMeta,
  /** The debt this entry lends, borrows or repays. */
  debtId: string | null = null,
): Promise<string> {
  const id = newId();
  const stamps = created();
  db.transaction((tx) => {
    tx.insert(transactions)
      .values({
        id,
        ...stamps,
        ...columns(input),
        source,
        transcript: voice?.transcript ?? null,
        confidence: voice?.confidence ?? null,
        debtId,
      })
      .run();
    for (const tagId of input.tagIds) {
      tx.insert(transactionTags)
        .values({ id: newId(), ...stamps, transactionId: id, tagId })
        .run();
    }
  });
  return id;
}

export async function updateTransaction(id: string, input: TransactionInput): Promise<void> {
  const now = new Date();
  const links = await db
    .select({ tagId: transactionTags.tagId })
    .from(transactionTags)
    .where(and(eq(transactionTags.transactionId, id), isNull(transactionTags.deletedAt)));
  const current = new Set(links.map((l) => l.tagId));
  const added = input.tagIds.filter((tagId) => !current.has(tagId));

  db.transaction((tx) => {
    tx.update(transactions)
      .set({ ...columns(input), updatedAt: now })
      .where(eq(transactions.id, id))
      .run();
    // Removed tags are soft-deleted so the change can sync later.
    tx.update(transactionTags)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(transactionTags.transactionId, id),
          isNull(transactionTags.deletedAt),
          input.tagIds.length > 0 ? not(inArray(transactionTags.tagId, input.tagIds)) : undefined,
        ),
      )
      .run();
    for (const tagId of added) {
      tx.insert(transactionTags)
        .values({ id: newId(), createdAt: now, updatedAt: now, transactionId: id, tagId })
        .run();
    }
  });
}

/** Soft delete; restoreTransaction undoes it. */
export async function deleteTransaction(id: string): Promise<void> {
  const now = new Date();
  await db
    .update(transactions)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(transactions.id, id));
}

export async function restoreTransaction(id: string): Promise<void> {
  await db
    .update(transactions)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(transactions.id, id));
}
