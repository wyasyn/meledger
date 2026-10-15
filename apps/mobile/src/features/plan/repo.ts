import {
  type BudgetInput,
  type ContributionInput,
  type DebtInput,
  type GoalInput,
  type RecurringInput,
  type SavingsGroupInput,
} from '@meledger/shared';
import { and, eq, isNull, sql } from 'drizzle-orm';

import { db } from '@/db/client';
import { created, newId } from '@/db/ids';
import {
  budgets,
  debts,
  goalContributions,
  goals,
  people,
  type RecurringRule,
  recurringRules,
  savingsGroups,
  transactions,
} from '@/db/schema';
import { createTransaction } from '@/features/transactions/repo';
import { createWallet } from '@/features/wallets/repo';

import {
  addFrequency,
  debtCategory,
  type DebtDirection,
  loanType,
  type RecurringTemplate,
  repaymentType,
} from './logic';

const softDelete = () => {
  const now = new Date();
  return { deletedAt: now, updatedAt: now };
};
const restore = () => ({ deletedAt: null, updatedAt: new Date() });

// ---------------------------------------------------------------------------------------------
// Budgets

const budgetColumns = (input: BudgetInput) => ({
  categoryId: input.categoryId,
  period: input.period,
  limitAmount: input.limitAmount,
  alertAt: input.alertAt,
  startsAt: input.period === 'custom' ? input.startsAt : null,
  endsAt: input.period === 'custom' ? input.endsAt : null,
});

export async function createBudget(input: BudgetInput): Promise<string> {
  const id = newId();
  await db.insert(budgets).values({ id, ...created(), ...budgetColumns(input) });
  return id;
}

export async function updateBudget(id: string, input: BudgetInput): Promise<void> {
  await db
    .update(budgets)
    .set({ ...budgetColumns(input), updatedAt: new Date() })
    .where(eq(budgets.id, id));
}

/**
 * Sets the budget for a category (the voice command "set food budget to 600k"): updates the
 * category's monthly budget if there is one, otherwise creates it.
 */
export async function setCategoryBudget(
  categoryId: string,
  limitAmount: number,
): Promise<'created' | 'updated'> {
  const [existing] = await db
    .select({ id: budgets.id })
    .from(budgets)
    .where(
      and(
        isNull(budgets.deletedAt),
        eq(budgets.categoryId, categoryId),
        eq(budgets.period, 'monthly'),
      ),
    )
    .limit(1);
  if (existing) {
    await db
      .update(budgets)
      .set({ limitAmount, updatedAt: new Date() })
      .where(eq(budgets.id, existing.id));
    return 'updated';
  }
  await createBudget({
    categoryId,
    period: 'monthly',
    limitAmount,
    alertAt: 80,
    startsAt: null,
    endsAt: null,
  });
  return 'created';
}

export async function deleteBudget(id: string): Promise<void> {
  await db.update(budgets).set(softDelete()).where(eq(budgets.id, id));
}

export async function restoreBudget(id: string): Promise<void> {
  await db.update(budgets).set(restore()).where(eq(budgets.id, id));
}

// ---------------------------------------------------------------------------------------------
// Goals

export async function createGoal(input: GoalInput): Promise<string> {
  const id = newId();
  await db.insert(goals).values({ id, ...created(), ...input, status: 'active' });
  return id;
}

export async function updateGoal(id: string, input: GoalInput): Promise<void> {
  await db
    .update(goals)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(goals.id, id));
}

export async function deleteGoal(id: string): Promise<void> {
  await db.update(goals).set(softDelete()).where(eq(goals.id, id));
}

export async function restoreGoal(id: string): Promise<void> {
  await db.update(goals).set(restore()).where(eq(goals.id, id));
}

/**
 * Money put towards a goal. It is a record of what was set aside; it does not move money
 * between wallets.
 */
export async function addContribution(goalId: string, input: ContributionInput): Promise<string> {
  const id = newId();
  await db.insert(goalContributions).values({ id, ...created(), goalId, ...input });
  return id;
}

export async function deleteContribution(id: string): Promise<void> {
  await db.update(goalContributions).set(softDelete()).where(eq(goalContributions.id, id));
}

// ---------------------------------------------------------------------------------------------
// Recurring bills (remind only: the user confirms each one)

const templateJson = (input: RecurringInput): string =>
  JSON.stringify({
    type: input.type,
    amount: input.amount,
    walletId: input.walletId,
    categoryId: input.categoryId,
    note: input.name.trim(),
  } satisfies RecurringTemplate);

export async function createRecurring(input: RecurringInput): Promise<string> {
  const id = newId();
  await db.insert(recurringRules).values({
    id,
    ...created(),
    name: input.name.trim(),
    template: templateJson(input),
    frequency: input.frequency,
    nextDueAt: input.nextDueAt,
    mode: 'remind',
  });
  return id;
}

export async function updateRecurring(id: string, input: RecurringInput): Promise<void> {
  await db
    .update(recurringRules)
    .set({
      name: input.name.trim(),
      template: templateJson(input),
      frequency: input.frequency,
      nextDueAt: input.nextDueAt,
      updatedAt: new Date(),
    })
    .where(eq(recurringRules.id, id));
}

/** Moves a bill on to its next due date (after logging or skipping this one). */
export async function advanceRecurring(rule: RecurringRule): Promise<void> {
  await db
    .update(recurringRules)
    .set({ nextDueAt: addFrequency(rule.nextDueAt, rule.frequency), updatedAt: new Date() })
    .where(eq(recurringRules.id, rule.id));
}

/** Undo for advanceRecurring. */
export async function setRecurringDue(id: string, nextDueAt: Date): Promise<void> {
  await db
    .update(recurringRules)
    .set({ nextDueAt, updatedAt: new Date() })
    .where(eq(recurringRules.id, id));
}

export async function deleteRecurring(id: string): Promise<void> {
  await db.update(recurringRules).set(softDelete()).where(eq(recurringRules.id, id));
}

export async function restoreRecurring(id: string): Promise<void> {
  await db.update(recurringRules).set(restore()).where(eq(recurringRules.id, id));
}

// ---------------------------------------------------------------------------------------------
// People and debts

/** Finds a person by name (case-insensitive) or adds them. */
export async function personIdFor(name: string): Promise<string> {
  const clean = name.trim();
  const [found] = await db
    .select({ id: people.id })
    .from(people)
    .where(and(isNull(people.deletedAt), sql`lower(${people.name}) = ${clean.toLowerCase()}`))
    .limit(1);
  if (found) return found.id;
  const id = newId();
  await db.insert(people).values({ id, ...created(), name: clean });
  return id;
}

/**
 * Records a debt. With a wallet, the loan itself is also an entry: lending takes the money out
 * of the wallet, borrowing puts it in.
 */
export async function createDebt(
  input: DebtInput,
  source: 'keyboard' | 'voice' = 'keyboard',
): Promise<string> {
  const personId = await personIdFor(input.person);
  const id = newId();
  await db.insert(debts).values({
    id,
    ...created(),
    personId,
    direction: input.direction,
    principal: input.principal,
    dueAt: input.dueAt,
    startedAt: input.startedAt,
    note: input.note.trim() || null,
    status: 'open',
  });
  if (input.walletId) {
    await createTransaction(
      {
        type: loanType(input.direction),
        amount: input.principal,
        walletId: input.walletId,
        toWalletId: null,
        categoryId: debtCategory(input.direction, false),
        occurredAt: input.startedAt,
        note:
          input.direction === 'owed_to_me'
            ? `Lent to ${input.person.trim()}`
            : `Borrowed from ${input.person.trim()}`,
        feeAmount: 0,
        tagIds: [],
      },
      source,
      undefined,
      id,
    );
  }
  return id;
}

export async function updateDebt(id: string, input: Omit<DebtInput, 'walletId'>): Promise<void> {
  const personId = await personIdFor(input.person);
  await db
    .update(debts)
    .set({
      personId,
      direction: input.direction,
      principal: input.principal,
      dueAt: input.dueAt,
      startedAt: input.startedAt,
      note: input.note.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(debts.id, id));
}

export async function setDebtStatus(id: string, status: 'open' | 'settled'): Promise<void> {
  await db.update(debts).set({ status, updatedAt: new Date() }).where(eq(debts.id, id));
}

/** A repayment is an entry in a wallet, linked to the debt. Settles the debt when it is paid off. */
export async function recordRepayment(
  debt: { id: string; direction: DebtDirection; principal: number },
  person: string,
  input: { amount: number; walletId: string; occurredAt: Date },
  repaidBefore: number,
  source: 'keyboard' | 'voice' = 'keyboard',
): Promise<string> {
  const txId = await createTransaction(
    {
      type: repaymentType(debt.direction),
      amount: input.amount,
      walletId: input.walletId,
      toWalletId: null,
      categoryId: debtCategory(debt.direction, true),
      occurredAt: input.occurredAt,
      note: debt.direction === 'owed_to_me' ? `${person} paid back` : `Paid back ${person}`,
      feeAmount: 0,
      tagIds: [],
    },
    source,
    undefined,
    debt.id,
  );
  if (repaidBefore + input.amount >= debt.principal) await setDebtStatus(debt.id, 'settled');
  return txId;
}

/**
 * Deletes the debt and the entries linked to it. Returns the deletion time, which restoreDebt
 * uses to bring back exactly those entries.
 */
export async function deleteDebt(id: string): Promise<Date> {
  const stamp = softDelete();
  db.transaction((tx) => {
    tx.update(debts).set(stamp).where(eq(debts.id, id)).run();
    tx.update(transactions)
      .set(stamp)
      .where(and(eq(transactions.debtId, id), isNull(transactions.deletedAt)))
      .run();
  });
  return stamp.deletedAt;
}

export async function restoreDebt(id: string, deletedAt: Date): Promise<void> {
  const stamp = restore();
  db.transaction((tx) => {
    tx.update(debts).set(stamp).where(eq(debts.id, id)).run();
    tx.update(transactions)
      .set(stamp)
      .where(and(eq(transactions.debtId, id), eq(transactions.deletedAt, deletedAt)))
      .run();
  });
}

/**
 * The open debt with this person in this direction (most recent first), for voice repayments
 * like "Musa paid me back 50k".
 */
export async function openDebtWith(personName: string, direction: DebtDirection) {
  const rows = await db
    .select({ debt: debts, person: people.name })
    .from(debts)
    .innerJoin(people, eq(people.id, debts.personId))
    .where(
      and(
        isNull(debts.deletedAt),
        eq(debts.status, 'open'),
        eq(debts.direction, direction),
        sql`lower(${people.name}) = ${personName.trim().toLowerCase()}`,
      ),
    );
  return rows.sort((a, b) => b.debt.createdAt.getTime() - a.debt.createdAt.getTime())[0] ?? null;
}

// ---------------------------------------------------------------------------------------------
// Savings groups

/** Creates the group and the savings wallet its money lives in. */
export async function createSavingsGroup(input: SavingsGroupInput): Promise<string> {
  const walletId = await createWallet({
    name: input.name.trim(),
    type: 'savings',
    provider: 'Savings group',
    currency: 'UGX',
    openingBalance: 0,
    color: 'teal',
  });
  const id = newId();
  await db.insert(savingsGroups).values({
    id,
    ...created(),
    walletId,
    name: input.name.trim(),
    contributionAmount: input.contributionAmount,
    frequency: input.frequency,
    members: JSON.stringify(input.members.map((m) => m.trim()).filter(Boolean)),
    payoutTurn: input.payoutTurn,
    cycleStart: input.cycleStart,
  });
  return id;
}

export async function updateSavingsGroup(id: string, input: SavingsGroupInput): Promise<void> {
  await db
    .update(savingsGroups)
    .set({
      name: input.name.trim(),
      contributionAmount: input.contributionAmount,
      frequency: input.frequency,
      members: JSON.stringify(input.members.map((m) => m.trim()).filter(Boolean)),
      payoutTurn: input.payoutTurn,
      cycleStart: input.cycleStart,
      updatedAt: new Date(),
    })
    .where(eq(savingsGroups.id, id));
}

export async function setSavingsGroupArchived(id: string, archived: boolean): Promise<void> {
  await db
    .update(savingsGroups)
    .set({ archived, updatedAt: new Date() })
    .where(eq(savingsGroups.id, id));
}

/** A contribution: a transfer from one of the user's wallets into the group's wallet. */
export async function contributeToGroup(
  group: { name: string; walletId: string },
  input: { amount: number; walletId: string; occurredAt: Date; feeAmount: number },
): Promise<string> {
  return createTransaction({
    type: 'transfer',
    amount: input.amount,
    walletId: input.walletId,
    toWalletId: group.walletId,
    categoryId: null,
    occurredAt: input.occurredAt,
    note: `${group.name} contribution`,
    feeAmount: input.feeAmount,
    tagIds: [],
  });
}

/** A payout: a transfer from the group's wallet into one of the user's wallets. */
export async function receiveGroupPayout(
  group: { name: string; walletId: string },
  input: { amount: number; walletId: string; occurredAt: Date },
): Promise<string> {
  return createTransaction({
    type: 'transfer',
    amount: input.amount,
    walletId: group.walletId,
    toWalletId: input.walletId,
    categoryId: null,
    occurredAt: input.occurredAt,
    note: `${group.name} payout`,
    feeAmount: 0,
    tagIds: [],
  });
}
