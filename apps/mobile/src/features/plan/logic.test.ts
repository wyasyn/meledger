import { describe, expect, it } from 'vitest';

import {
  budgetPeriodLabel,
  budgetStatus,
  debtBalance,
  dueLabel,
  dueState,
  goalBandText,
  goalProgress,
  groupSchedule,
  groupTotals,
  parseMembers,
  parseTemplate,
  type PlanTransaction,
} from './logic';

// Wednesday 14 October 2026, mid-afternoon local time.
const now = new Date(2026, 9, 14, 15, 30);
const FOOD = 'food';

const tx = (over: Partial<PlanTransaction>): PlanTransaction => ({
  type: 'expense',
  amount: 0,
  categoryId: FOOD,
  debtId: null,
  walletId: 'cash',
  toWalletId: null,
  occurredAt: now.getTime(),
  ...over,
});

describe('budgets', () => {
  const monthly = {
    categoryId: FOOD,
    period: 'monthly' as const,
    limitAmount: 600_000,
    alertAt: 80,
    startsAt: null,
    endsAt: null,
  };

  it('sums spending in the category for this month only', () => {
    const s = budgetStatus(
      monthly,
      [
        tx({ amount: 100_000 }),
        tx({ amount: 50_000, occurredAt: new Date(2026, 9, 1).getTime() }),
        tx({ amount: 999, occurredAt: new Date(2026, 8, 30).getTime() }),
        tx({ amount: 999, categoryId: 'other' }),
        tx({ amount: 999, type: 'income' }),
      ],
      now,
    );
    expect(s.spent).toBe(150_000);
    expect(s.remaining).toBe(450_000);
    expect(s.ratio).toBeCloseTo(0.25);
    expect(s.state).toBe('ok');
  });

  it('warns from the alert percentage and goes over past the limit', () => {
    expect(budgetStatus(monthly, [tx({ amount: 480_000 })], now).state).toBe('warning');
    expect(budgetStatus(monthly, [tx({ amount: 600_000 })], now).state).toBe('warning');
    const over = budgetStatus(monthly, [tx({ amount: 650_000 })], now);
    expect(over.state).toBe('over');
    expect(over.remaining).toBe(-50_000);
  });

  it('weekly budgets start on Monday', () => {
    const weekly = { ...monthly, period: 'weekly' as const };
    const s = budgetStatus(
      weekly,
      [
        tx({ amount: 10_000, occurredAt: new Date(2026, 9, 12).getTime() }),
        tx({ amount: 99_000, occurredAt: new Date(2026, 9, 11, 23).getTime() }),
      ],
      now,
    );
    expect(s.spent).toBe(10_000);
  });

  it('custom budgets use their own dates', () => {
    const custom = {
      ...monthly,
      period: 'custom' as const,
      startsAt: new Date(2026, 9, 10),
      endsAt: new Date(2026, 9, 21),
    };
    const s = budgetStatus(
      custom,
      [
        tx({ amount: 5_000, occurredAt: new Date(2026, 9, 20, 22).getTime() }),
        tx({ amount: 7_000, occurredAt: new Date(2026, 9, 21).getTime() }),
      ],
      now,
    );
    expect(s.spent).toBe(5_000);
    expect(budgetPeriodLabel(custom, now)).toBe('10 to 20 Oct 2026');
    expect(budgetPeriodLabel(custom, new Date(2026, 9, 1))).toBe('Starts 10 Oct');
    expect(budgetPeriodLabel(monthly, now)).toBe('This month');
  });
});

describe('goals', () => {
  const goal = {
    targetAmount: 1_000_000,
    createdAt: new Date(2026, 0, 1),
    targetDate: new Date(2027, 0, 1),
  };

  it('is behind when saving trails the even pace to the target date', () => {
    const p = goalProgress(goal, 200_000, now);
    expect(p.ratio).toBeCloseTo(0.2);
    expect(p.expected).toBeGreaterThan(0.78);
    expect(p.schedule).toBe('behind');
    expect(p.behindBy).toBeGreaterThanOrEqual(58);
    expect(p.left).toBe(800_000);
    expect(goalBandText(p, goal.targetDate)).toMatch(/^You're \d+% behind schedule/);
  });

  it('is on track within five points of the pace', () => {
    expect(goalProgress(goal, 760_000, now).schedule).toBe('on_track');
  });

  it('is done at the target, and has no schedule without a date', () => {
    expect(goalProgress(goal, 1_000_000, now).schedule).toBe('done');
    const undated = goalProgress({ ...goal, targetDate: null }, 10, now);
    expect(undated.schedule).toBe('no_date');
    expect(undated.expected).toBeNull();
    expect(goalBandText(undated, null)).toBeNull();
  });

  it('is overdue after the target date', () => {
    const p = goalProgress({ ...goal, targetDate: new Date(2026, 9, 1) }, 500_000, now);
    expect(p.schedule).toBe('overdue');
  });
});

describe('recurring bills', () => {
  it('reads a stored template and rejects junk', () => {
    expect(
      parseTemplate(
        '{"type":"expense","amount":350000,"walletId":"w","categoryId":"c","note":"Rent"}',
      ),
    ).toEqual({ type: 'expense', amount: 350_000, walletId: 'w', categoryId: 'c', note: 'Rent' });
    expect(parseTemplate('nope')).toBeNull();
    expect(parseTemplate('{"type":"transfer","amount":1}')).toBeNull();
  });

  it('labels how soon a bill is due', () => {
    expect(dueState(new Date(2026, 9, 14, 8), now)).toBe('today');
    expect(dueState(new Date(2026, 9, 13), now)).toBe('overdue');
    expect(dueState(new Date(2026, 9, 17), now)).toBe('soon');
    expect(dueState(new Date(2026, 9, 28), now)).toBe('later');
    expect(dueLabel(new Date(2026, 9, 15), now)).toBe('Due tomorrow');
    expect(dueLabel(new Date(2026, 9, 11), now)).toBe('Was due 3 days ago');
    expect(dueLabel(new Date(2026, 9, 28), now)).toBe('Due 28 Oct');
  });
});

describe('debts', () => {
  it('counts only repayments in the right direction', () => {
    const debt = { id: 'd1', direction: 'owed_to_me' as const, principal: 100_000 };
    const b = debtBalance(debt, [
      // The loan itself went out.
      tx({ type: 'expense', amount: 100_000, debtId: 'd1' }),
      tx({ type: 'income', amount: 30_000, debtId: 'd1' }),
      tx({ type: 'income', amount: 20_000, debtId: 'd2' }),
    ]);
    expect(b).toEqual({ principal: 100_000, repaid: 30_000, remaining: 70_000, ratio: 0.3 });
  });

  it('never goes below zero', () => {
    const debt = { id: 'd1', direction: 'i_owe' as const, principal: 50_000 };
    expect(debtBalance(debt, [tx({ amount: 60_000, debtId: 'd1' })]).remaining).toBe(0);
  });
});

describe('savings groups', () => {
  const group = {
    contributionAmount: 50_000,
    frequency: 'weekly' as const,
    members: ['Amina', 'Okello', 'Sarah'],
    payoutTurn: 3,
    cycleStart: new Date(2026, 9, 2),
  };

  it('finds the next contribution and the payout turn', () => {
    const s = groupSchedule(group, now);
    expect(s.nextContribution).toEqual(new Date(2026, 9, 16));
    expect(s.round).toBe(3);
    expect(s.memberCount).toBe(4);
    expect(s.payoutDate).toEqual(new Date(2026, 9, 16));
    expect(s.payoutAmount).toBe(200_000);
  });

  it('counts today as the next contribution day', () => {
    expect(
      groupSchedule({ ...group, cycleStart: new Date(2026, 9, 7) }, now).nextContribution,
    ).toEqual(new Date(2026, 9, 14));
  });

  it('monthly groups step by month', () => {
    const s = groupSchedule(
      { ...group, frequency: 'monthly', cycleStart: new Date(2026, 6, 31), payoutTurn: null },
      now,
    );
    expect(s.nextContribution).toEqual(new Date(2026, 9, 31));
    expect(s.payoutDate).toBeNull();
  });

  it('adds up money in and out of the group wallet', () => {
    const t = groupTotals('g', [
      tx({ type: 'transfer', amount: 50_000, walletId: 'cash', toWalletId: 'g' }),
      tx({ type: 'transfer', amount: 50_000, walletId: 'momo', toWalletId: 'g' }),
      tx({ type: 'transfer', amount: 200_000, walletId: 'g', toWalletId: 'cash' }),
      tx({ type: 'expense', amount: 1, walletId: 'g' }),
    ]);
    expect(t).toEqual({ contributed: 100_000, received: 200_000 });
  });

  it('reads member lists defensively', () => {
    expect(parseMembers('["A","B"]')).toEqual(['A', 'B']);
    expect(parseMembers('oops')).toEqual([]);
  });
});
