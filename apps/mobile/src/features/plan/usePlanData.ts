import { asc, eq, isNull } from 'drizzle-orm';
import { useMemo } from 'react';

import { db } from '@/db/client';
import {
  type Budget,
  budgets,
  type Debt,
  debts,
  type Goal,
  type GoalContribution,
  goalContributions,
  goals,
  people,
  type RecurringRule,
  recurringRules,
  type SavingsGroup,
  savingsGroups,
} from '@/db/schema';
import { useLiveData } from '@/db/useLiveData';
import type { LedgerData } from '@/features/transactions/useLedgerData';

import type { PlanTransaction } from './logic';

export interface PlanData {
  budgets: Budget[];
  /** Not archived, oldest first. */
  goals: Goal[];
  contributions: GoalContribution[];
  /** Soonest due first. */
  recurring: RecurringRule[];
  debts: (Debt & { person: string })[];
  groups: SavingsGroup[];
}

async function loadPlan(): Promise<PlanData> {
  const [budgetRows, goalRows, contributionRows, recurringRows, debtRows, groupRows] =
    await Promise.all([
      db.select().from(budgets).where(isNull(budgets.deletedAt)).orderBy(asc(budgets.createdAt)),
      db.select().from(goals).where(isNull(goals.deletedAt)).orderBy(asc(goals.createdAt)),
      db
        .select()
        .from(goalContributions)
        .where(isNull(goalContributions.deletedAt))
        .orderBy(asc(goalContributions.occurredAt)),
      db
        .select()
        .from(recurringRules)
        .where(isNull(recurringRules.deletedAt))
        .orderBy(asc(recurringRules.nextDueAt)),
      db
        .select({ debt: debts, person: people.name })
        .from(debts)
        .innerJoin(people, eq(people.id, debts.personId))
        .where(isNull(debts.deletedAt))
        .orderBy(asc(debts.createdAt)),
      db
        .select()
        .from(savingsGroups)
        .where(isNull(savingsGroups.deletedAt))
        .orderBy(asc(savingsGroups.createdAt)),
    ]);
  return {
    budgets: budgetRows,
    goals: goalRows.filter((g) => g.status !== 'archived'),
    contributions: contributionRows,
    recurring: recurringRows,
    debts: debtRows.map(({ debt, person }) => ({ ...debt, person })),
    groups: groupRows,
  };
}

const TABLES = [
  'budgets',
  'goals',
  'goal_contributions',
  'recurring_rules',
  'debts',
  'people',
  'savings_groups',
] as const;

/** Budgets, goals, bills, debts and savings groups, kept live as the database changes. */
export function usePlanData(): PlanData | undefined {
  return useLiveData(loadPlan, TABLES, []);
}

/** The loaded entries in the plain shape the Plan logic reads. */
export function usePlanTransactions(data: LedgerData | undefined): PlanTransaction[] {
  return useMemo(
    () =>
      (data?.transactions ?? []).map((tx) => ({
        type: tx.type,
        amount: tx.amount,
        categoryId: tx.categoryId,
        debtId: tx.debtId,
        walletId: tx.walletId,
        toWalletId: tx.toWalletId,
        occurredAt: tx.occurredAt.getTime(),
      })),
    [data],
  );
}
