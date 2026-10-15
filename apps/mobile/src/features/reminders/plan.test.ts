import { describe, expect, it } from 'vitest';

import { buildNotificationPlan, type NotificationInput } from './plan';

const now = new Date('2026-10-15T10:00');

const base: NotificationInput = {
  settings: {
    reminderOn: true,
    reminderTime: '20:00',
    billAlerts: true,
    budgetAlerts: true,
    goalAlerts: true,
    quietStart: '22:00',
    quietEnd: '07:00',
  },
  loggedAt: [],
  transactions: [],
  categoryNames: new Map([['food', 'Groceries']]),
  budgets: [],
  goals: [],
  contributions: [],
  bills: [],
};

describe('buildNotificationPlan', () => {
  it('schedules a week of daily reminders, skipping today once something is logged', () => {
    const fresh = buildNotificationPlan(base, now);
    expect(fresh.scheduled.filter((s) => s.channel === 'daily')).toHaveLength(7);
    expect(fresh.scheduled[0]?.identifier).toBe('daily:2026-10-15');

    const logged = buildNotificationPlan(
      { ...base, loggedAt: [new Date('2026-10-15T08:00')] },
      now,
    );
    expect(logged.scheduled[0]?.identifier).toBe('daily:2026-10-16');
  });

  it('schedules nothing daily when the reminder is off', () => {
    const plan = buildNotificationPlan(
      { ...base, settings: { ...base.settings, reminderOn: false } },
      now,
    );
    expect(plan.scheduled).toEqual([]);
  });

  it('announces a bill the morning before it is due', () => {
    const plan = buildNotificationPlan(
      {
        ...base,
        settings: { ...base.settings, reminderOn: false },
        bills: [
          { id: 'rent', name: 'Rent', nextDueAt: new Date('2026-10-20T00:00'), amount: 500_000 },
        ],
      },
      now,
    );
    expect(plan.scheduled).toEqual([
      expect.objectContaining({
        identifier: 'bill:rent:2026-10-20',
        date: new Date('2026-10-19T09:00'),
        title: 'Rent is due tomorrow',
      }),
    ]);
  });

  it('raises budget and goal alerts from the data', () => {
    const plan = buildNotificationPlan(
      {
        ...base,
        transactions: [
          {
            type: 'expense',
            amount: 90_000,
            categoryId: 'food',
            debtId: null,
            walletId: 'cash',
            toWalletId: null,
            occurredAt: new Date('2026-10-10T12:00').getTime(),
          },
        ],
        budgets: [
          {
            id: 'b1',
            categoryId: 'food',
            period: 'monthly',
            limitAmount: 100_000,
            alertAt: 80,
            startsAt: null,
            endsAt: null,
          },
        ],
        goals: [{ id: 'g1', name: 'Laptop', targetAmount: 1_000_000, status: 'active' }],
        contributions: [{ goalId: 'g1', amount: 500_000 }],
      },
      now,
    );
    expect(plan.alerts.map((a) => a.key)).toEqual(['budget:b1:2026-10-01:80', 'goal:g1:50']);
    expect(plan.alerts[0]?.title).toBe('Groceries budget at 90%');
  });

  it('leaves alerts out when they are switched off', () => {
    const plan = buildNotificationPlan(
      {
        ...base,
        settings: { ...base.settings, goalAlerts: false },
        goals: [{ id: 'g1', name: 'Laptop', targetAmount: 1_000_000, status: 'active' }],
        contributions: [{ goalId: 'g1', amount: 1_000_000 }],
      },
      now,
    );
    expect(plan.alerts).toEqual([]);
  });
});
