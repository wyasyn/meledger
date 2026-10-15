import { DEBT_CATEGORY_IDS } from '@meledger/shared';
import {
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  format,
  startOfDay,
} from 'date-fns';

import { monthPeriod, type Period, weekPeriod } from '../home/logic';

/** The fields of an entry the Plan tab reads. Times are epoch milliseconds. */
export interface PlanTransaction {
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  categoryId: string | null;
  debtId: string | null;
  walletId: string;
  toWalletId: string | null;
  occurredAt: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// ---------------------------------------------------------------------------------------------
// Budgets

export type BudgetPeriod = 'monthly' | 'weekly' | 'custom';

export const BUDGET_PERIOD_LABELS: Record<BudgetPeriod, string> = {
  monthly: 'Monthly',
  weekly: 'Weekly',
  custom: 'Custom dates',
};

export interface BudgetLike {
  categoryId: string;
  period: BudgetPeriod;
  limitAmount: number;
  alertAt: number;
  startsAt: Date | null;
  endsAt: Date | null;
}

/**
 * The dates a budget covers now: this calendar month, this week (Monday start) or its own
 * dates. A custom budget without dates covers nothing.
 */
export function budgetPeriod(budget: BudgetLike, now: Date): Period | null {
  switch (budget.period) {
    case 'monthly':
      return monthPeriod(now);
    case 'weekly':
      return weekPeriod(now);
    case 'custom':
      return budget.startsAt && budget.endsAt
        ? { kind: 'custom', from: budget.startsAt, to: budget.endsAt }
        : null;
  }
}

export type BudgetState = 'ok' | 'warning' | 'over';

export interface BudgetStatus {
  spent: number;
  limit: number;
  /** Spent over limit; above 1 when over budget. */
  ratio: number;
  /** Negative when over budget. */
  remaining: number;
  /** "warning" from the alert percentage (default 80%), "over" past 100%. */
  state: BudgetState;
  period: Period | null;
}

export function budgetStatus(
  budget: BudgetLike,
  transactions: readonly Pick<PlanTransaction, 'type' | 'amount' | 'categoryId' | 'occurredAt'>[],
  now: Date,
): BudgetStatus {
  const period = budgetPeriod(budget, now);
  let spent = 0;
  if (period) {
    const from = period.from.getTime();
    const to = period.to.getTime();
    for (const tx of transactions) {
      if (tx.type !== 'expense' || tx.categoryId !== budget.categoryId) continue;
      if (tx.occurredAt >= from && tx.occurredAt < to) spent += tx.amount;
    }
  }
  const limit = budget.limitAmount;
  const ratio = limit > 0 ? spent / limit : 0;
  const state: BudgetState = ratio > 1 ? 'over' : ratio >= budget.alertAt / 100 ? 'warning' : 'ok';
  return { spent, limit, ratio, remaining: limit - spent, state, period };
}

/** "This month", "This week", "1 to 15 Oct 2026" (custom), "Not started" before custom dates. */
export function budgetPeriodLabel(budget: BudgetLike, now: Date): string {
  if (budget.period === 'monthly') return 'This month';
  if (budget.period === 'weekly') return 'This week';
  if (!budget.startsAt || !budget.endsAt) return 'Custom dates';
  const last = new Date(budget.endsAt.getTime() - 1);
  const range =
    budget.startsAt.getMonth() === last.getMonth() &&
    budget.startsAt.getFullYear() === last.getFullYear()
      ? `${format(budget.startsAt, 'd')} to ${format(last, 'd MMM yyyy')}`
      : `${format(budget.startsAt, 'd MMM')} to ${format(last, 'd MMM yyyy')}`;
  if (now < budget.startsAt) return `Starts ${format(budget.startsAt, 'd MMM')}`;
  if (now >= budget.endsAt) return `Ended · ${range}`;
  return range;
}

// ---------------------------------------------------------------------------------------------
// Goals

export type GoalSchedule = 'done' | 'on_track' | 'behind' | 'overdue' | 'no_date';

export interface GoalProgress {
  saved: number;
  target: number;
  /** 0 to 1. */
  ratio: number;
  left: number;
  /** Where the bar should be by now (0 to 1), when the goal has a target date. */
  expected: number | null;
  schedule: GoalSchedule;
  /** Percentage points behind the expected progress (30 = "30% behind"). */
  behindBy: number;
}

/** Below this many points behind, a goal still counts as on track. */
const ON_TRACK_SLACK = 0.05;

/**
 * How a goal is doing: progress, and where it should be by now if saving evenly from the day it
 * was created to its target date (the hatched "expected" segment on the goal card).
 */
export function goalProgress(
  goal: { targetAmount: number; targetDate: Date | null; createdAt: Date },
  saved: number,
  now: Date,
): GoalProgress {
  const target = goal.targetAmount;
  const ratio = target > 0 ? clamp01(saved / target) : 0;
  const left = Math.max(0, target - saved);
  const base = { saved, target, ratio, left };
  if (target > 0 && saved >= target) {
    return { ...base, expected: goal.targetDate ? 1 : null, schedule: 'done', behindBy: 0 };
  }
  if (!goal.targetDate) return { ...base, expected: null, schedule: 'no_date', behindBy: 0 };

  const start = goal.createdAt.getTime();
  const end = goal.targetDate.getTime();
  if (now.getTime() >= end) {
    return { ...base, expected: 1, schedule: 'overdue', behindBy: Math.round((1 - ratio) * 100) };
  }
  const expected = end > start ? clamp01((now.getTime() - start) / (end - start)) : 1;
  const gap = expected - ratio;
  return gap > ON_TRACK_SLACK
    ? { ...base, expected, schedule: 'behind', behindBy: Math.round(gap * 100) }
    : { ...base, expected, schedule: 'on_track', behindBy: 0 };
}

/** The coloured band under a goal card. */
export function goalBandText(p: GoalProgress, targetDate: Date | null): string | null {
  switch (p.schedule) {
    case 'done':
      return 'Goal reached. Well done!';
    case 'behind':
      return `You're ${p.behindBy}% behind schedule and off target.`;
    case 'overdue':
      return targetDate
        ? `The target date (${format(targetDate, 'd MMM yyyy')}) has passed.`
        : 'The target date has passed.';
    case 'on_track':
      return targetDate
        ? `You're on track for ${format(targetDate, 'd MMM yyyy')}.`
        : "You're on track.";
    case 'no_date':
      return null;
  }
}

/** Sum of contributions per goal id. */
export function savedByGoal(
  contributions: readonly { goalId: string; amount: number }[],
): Map<string, number> {
  const saved = new Map<string, number>();
  for (const c of contributions) saved.set(c.goalId, (saved.get(c.goalId) ?? 0) + c.amount);
  return saved;
}

// ---------------------------------------------------------------------------------------------
// Recurring bills

export type Frequency = 'weekly' | 'monthly' | 'yearly';

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: 'Every week',
  monthly: 'Every month',
  yearly: 'Every year',
};

/** The entry a recurring bill fills in when it is logged (stored as JSON). */
export interface RecurringTemplate {
  type: 'expense' | 'income';
  amount: number;
  walletId: string;
  categoryId: string | null;
  note: string;
}

export function parseTemplate(json: string): RecurringTemplate | null {
  try {
    const t = JSON.parse(json) as Partial<RecurringTemplate>;
    if ((t.type !== 'expense' && t.type !== 'income') || typeof t.amount !== 'number') return null;
    return {
      type: t.type,
      amount: t.amount,
      walletId: t.walletId ?? '',
      categoryId: t.categoryId ?? null,
      note: t.note ?? '',
    };
  } catch {
    return null;
  }
}

export function addFrequency(date: Date, frequency: Frequency, times = 1): Date {
  switch (frequency) {
    case 'weekly':
      return addWeeks(date, times);
    case 'monthly':
      return addMonths(date, times);
    case 'yearly':
      return addYears(date, times);
  }
}

export type DueState = 'overdue' | 'today' | 'soon' | 'later';

/** Soon = within 3 days. */
export function dueState(dueAt: Date, now: Date): DueState {
  const days = differenceInCalendarDays(startOfDay(dueAt), startOfDay(now));
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= 3) return 'soon';
  return 'later';
}

/** "Due today", "Due tomorrow", "Due in 3 days", "Was due 2 days ago", "Due 28 Oct". */
export function dueLabel(dueAt: Date, now: Date): string {
  const days = differenceInCalendarDays(startOfDay(dueAt), startOfDay(now));
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days === -1) return 'Was due yesterday';
  if (days < 0) return `Was due ${-days} days ago`;
  if (days <= 6) return `Due in ${days} days`;
  return `Due ${format(dueAt, 'd MMM')}`;
}

// ---------------------------------------------------------------------------------------------
// Debts and loans

export type DebtDirection = 'owed_to_me' | 'i_owe';

/** A repayment moves money the opposite way to the loan: in when owed to me, out when I owe. */
export const repaymentType = (direction: DebtDirection): 'income' | 'expense' =>
  direction === 'owed_to_me' ? 'income' : 'expense';

/** The first movement of a debt: lending takes money out, borrowing brings it in. */
export const loanType = (direction: DebtDirection): 'income' | 'expense' =>
  direction === 'owed_to_me' ? 'expense' : 'income';

/** The category an entry for this debt uses. */
export function debtCategory(direction: DebtDirection, repayment: boolean): string {
  if (direction === 'owed_to_me') {
    return repayment ? DEBT_CATEGORY_IDS.repaidToMe : DEBT_CATEGORY_IDS.lent;
  }
  return repayment ? DEBT_CATEGORY_IDS.repay : DEBT_CATEGORY_IDS.borrowed;
}

/** What a spoken loan or repayment is: which way the debt runs, and whether it repays one. */
export function debtFromKind(kind: 'lend' | 'borrow' | 'repaid_to_me' | 'repay'): {
  direction: DebtDirection;
  repayment: boolean;
} {
  switch (kind) {
    case 'lend':
      return { direction: 'owed_to_me', repayment: false };
    case 'repaid_to_me':
      return { direction: 'owed_to_me', repayment: true };
    case 'borrow':
      return { direction: 'i_owe', repayment: false };
    case 'repay':
      return { direction: 'i_owe', repayment: true };
  }
}

export interface DebtBalance {
  principal: number;
  repaid: number;
  remaining: number;
  ratio: number;
}

/** What is left on a debt after the repayments linked to it. */
export function debtBalance(
  debt: { id: string; direction: DebtDirection; principal: number },
  transactions: readonly PlanTransaction[],
): DebtBalance {
  const type = repaymentType(debt.direction);
  let repaid = 0;
  for (const tx of transactions) {
    if (tx.debtId === debt.id && tx.type === type) repaid += tx.amount;
  }
  const remaining = Math.max(0, debt.principal - repaid);
  const ratio = debt.principal > 0 ? clamp01(repaid / debt.principal) : 0;
  return { principal: debt.principal, repaid, remaining, ratio };
}

// ---------------------------------------------------------------------------------------------
// Savings groups (SACCO, VSLA, chama)

export interface GroupLike {
  contributionAmount: number;
  frequency: 'weekly' | 'monthly';
  members: readonly string[];
  payoutTurn: number | null;
  cycleStart: Date;
}

export interface GroupSchedule {
  /** Next contribution day on or after today. */
  nextContribution: Date;
  /** 1-based number of that contribution. */
  round: number;
  /** Members including the user (at least the payout turn). */
  memberCount: number;
  /** When it is the user's turn to receive, if the group rotates. */
  payoutDate: Date | null;
  /** Contribution times members: what the user receives on their turn. */
  payoutAmount: number;
}

export const parseMembers = (json: string): string[] => {
  try {
    const value: unknown = JSON.parse(json);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
};

export function groupSchedule(group: GroupLike, now: Date): GroupSchedule {
  const today = startOfDay(now);
  const start = startOfDay(group.cycleStart);
  let round = 1;
  let next = start;
  // At most a few hundred steps (weekly for years); simple and exact with month lengths.
  while (next < today && round < 2000) {
    round += 1;
    next = addFrequency(start, group.frequency, round - 1);
  }
  const memberCount = Math.max(group.members.length + 1, group.payoutTurn ?? 0, 1);
  const payoutDate =
    group.payoutTurn !== null && group.payoutTurn > 0
      ? addFrequency(start, group.frequency, group.payoutTurn - 1)
      : null;
  return {
    nextContribution: next,
    round,
    memberCount,
    payoutDate,
    payoutAmount: group.contributionAmount * memberCount,
  };
}

/** Money the user has put into a group's wallet and taken out of it. */
export function groupTotals(
  walletId: string,
  transactions: readonly PlanTransaction[],
): { contributed: number; received: number } {
  let contributed = 0;
  let received = 0;
  for (const tx of transactions) {
    if (tx.type !== 'transfer') continue;
    if (tx.toWalletId === walletId) contributed += tx.amount;
    else if (tx.walletId === walletId) received += tx.amount;
  }
  return { contributed, received };
}
