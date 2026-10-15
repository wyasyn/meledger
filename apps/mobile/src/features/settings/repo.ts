import { desc, eq, isNotNull, isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import * as schema from '@/db/schema';
import { seedDatabase } from '@/db/seed';
import { useLiveData } from '@/db/useLiveData';
import { useHomeStore } from '@/features/home/store';
import { useOnboarding } from '@/features/onboarding/store';
import { updateProfile } from '@/features/profile/repo';
import { cancelAllReminders } from '@/features/reminders/notifications';
import { useBalancesRevealed } from '@/features/security/balances';

const { vocabulary, transactions } = schema;

export interface LearnedWord {
  id: string;
  phrase: string;
  targetType: 'category' | 'wallet' | 'person';
  /** Name of the category, wallet or person it now means; null if that was deleted. */
  targetName: string | null;
  hits: number;
}

async function loadLearnedWords(): Promise<LearnedWord[]> {
  const [words, categoryRows, walletRows, peopleRows] = await Promise.all([
    db.select().from(vocabulary).where(isNull(vocabulary.deletedAt)).orderBy(desc(vocabulary.hits)),
    db.select({ id: schema.categories.id, name: schema.categories.name }).from(schema.categories),
    db.select({ id: schema.wallets.id, name: schema.wallets.name }).from(schema.wallets),
    db.select({ id: schema.people.id, name: schema.people.name }).from(schema.people),
  ]);
  const names = {
    category: new Map(categoryRows.map((r) => [r.id, r.name])),
    wallet: new Map(walletRows.map((r) => [r.id, r.name])),
    person: new Map(peopleRows.map((r) => [r.id, r.name])),
  };
  return words.map((w) => ({
    id: w.id,
    phrase: w.phrase,
    targetType: w.targetType,
    targetName: names[w.targetType].get(w.targetId) ?? null,
    hits: w.hits,
  }));
}

/** Words MeLedger learned from corrections, most used first. */
export function useLearnedWords(): LearnedWord[] | undefined {
  return useLiveData(loadLearnedWords, ['vocabulary', 'categories', 'wallets', 'people'], []);
}

export async function forgetWord(id: string): Promise<void> {
  const now = new Date();
  await db.update(vocabulary).set({ deletedAt: now, updatedAt: now }).where(eq(vocabulary.id, id));
}

export async function forgetAllWords(): Promise<void> {
  const now = new Date();
  await db
    .update(vocabulary)
    .set({ deletedAt: now, updatedAt: now })
    .where(isNull(vocabulary.deletedAt));
}

/** Turning transcript storage off also clears every transcript already saved. */
export async function setStoreTranscripts(on: boolean): Promise<void> {
  await updateProfile({ storeTranscripts: on });
  if (on) return;
  await db
    .update(transactions)
    .set({ transcript: null, updatedAt: new Date() })
    .where(isNotNull(transactions.transcript));
}

/** Every table on the phone, children before parents. */
const ALL_TABLES = [
  schema.alertLog,
  schema.transactionTags,
  schema.goalContributions,
  schema.transactions,
  schema.budgets,
  schema.goals,
  schema.recurringRules,
  schema.debts,
  schema.savingsGroups,
  schema.reminders,
  schema.vocabulary,
  schema.tags,
  schema.people,
  schema.categories,
  schema.wallets,
  schema.profile,
];

/**
 * Erases everything stored on this phone and starts again from a fresh install: default
 * categories and a Cash wallet, then onboarding.
 */
export async function deleteAllLocalData(): Promise<void> {
  await cancelAllReminders();
  for (const table of ALL_TABLES) await db.delete(table);
  seedDatabase();
  // Answers and filters held in memory belong to the old data too.
  useOnboarding.setState(useOnboarding.getInitialState(), true);
  useHomeStore.setState(useHomeStore.getInitialState(), true);
  useBalancesRevealed.setState(useBalancesRevealed.getInitialState(), true);
}
