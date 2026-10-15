import { CATEGORY_SEEDS, type CategoryInput } from '@meledger/shared';
import { and, asc, eq, isNull, max } from 'drizzle-orm';

import { db } from '@/db/client';
import { created, newId } from '@/db/ids';
import { budgets, type Category, categories, transactions, vocabulary } from '@/db/schema';
import { useLiveData } from '@/db/useLiveData';

/** Where a deleted custom income category's entries go. Expenses become uncategorised. */
const OTHER_INCOME_ID = CATEGORY_SEEDS.find((c) => c.kind === 'income' && c.name === 'Other')?.id;

/** Group custom categories are listed under. */
export const CUSTOM_GROUP = 'My categories';

const TABLES = ['categories'] as const;

/** Every category including hidden ones, in picker order. Undefined while loading. */
export function useAllCategories(): Category[] | undefined {
  return useLiveData(
    () =>
      db
        .select()
        .from(categories)
        .where(isNull(categories.deletedAt))
        .orderBy(asc(categories.sort), asc(categories.name)),
    TABLES,
    [],
  );
}

export async function setCategoryHidden(id: string, hidden: boolean): Promise<void> {
  await db.update(categories).set({ hidden, updatedAt: new Date() }).where(eq(categories.id, id));
}

export async function createCategory(input: CategoryInput): Promise<string> {
  const id = newId();
  const [last] = await db.select({ sort: max(categories.sort) }).from(categories);
  await db.insert(categories).values({
    id,
    ...created(),
    ...input,
    group: CUSTOM_GROUP,
    isSystem: false,
    sort: (last?.sort ?? 0) + 1,
  });
  return id;
}

/** Custom categories only: built-in ones keep their name, icon and colour. */
export async function updateCategory(
  id: string,
  input: Omit<CategoryInput, 'kind'>,
): Promise<void> {
  await db
    .update(categories)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(categories.id, id), eq(categories.isSystem, false)));
}

/**
 * Deletes a custom category. Its expenses become uncategorised and its income moves to
 * "Other"; its budgets and learned words go with it.
 */
export async function deleteCategory(category: Category): Promise<void> {
  if (category.isSystem) return;
  const now = new Date();
  await db
    .update(transactions)
    .set({
      categoryId: category.kind === 'income' ? (OTHER_INCOME_ID ?? null) : null,
      updatedAt: now,
    })
    .where(eq(transactions.categoryId, category.id));
  await db
    .update(budgets)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(budgets.categoryId, category.id));
  await db
    .update(vocabulary)
    .set({ deletedAt: now, updatedAt: now })
    .where(and(eq(vocabulary.targetType, 'category'), eq(vocabulary.targetId, category.id)));
  await db
    .update(categories)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(categories.id, category.id));
}

/** How many entries use a category (shown before deleting it). */
export async function countCategoryEntries(id: string): Promise<number> {
  const rows = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.categoryId, id), isNull(transactions.deletedAt)));
  return rows.length;
}
