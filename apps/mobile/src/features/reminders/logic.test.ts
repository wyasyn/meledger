import { describe, expect, it } from 'vitest';

import {
  billAlertDate,
  budgetAlerts,
  dailyReminderDates,
  goalAlerts,
  inQuietHours,
  outsideQuietHours,
} from './logic';

const at = (iso: string) => new Date(iso);

describe('quiet hours', () => {
  it('handles a range across midnight', () => {
    expect(inQuietHours(at('2026-10-15T23:00'), '22:00', '07:00')).toBe(true);
    expect(inQuietHours(at('2026-10-15T06:59'), '22:00', '07:00')).toBe(true);
    expect(inQuietHours(at('2026-10-15T07:00'), '22:00', '07:00')).toBe(false);
    expect(inQuietHours(at('2026-10-15T12:00'), '22:00', '07:00')).toBe(false);
  });

  it('moves an alert to the end of quiet hours', () => {
    expect(outsideQuietHours(at('2026-10-15T23:30'), '22:00', '07:00')).toEqual(
      at('2026-10-16T07:00'),
    );
    expect(outsideQuietHours(at('2026-10-16T03:00'), '22:00', '07:00')).toEqual(
      at('2026-10-16T07:00'),
    );
    expect(outsideQuietHours(at('2026-10-16T09:00'), '22:00', '07:00')).toEqual(
      at('2026-10-16T09:00'),
    );
  });
});

describe('dailyReminderDates', () => {
  it('includes today when nothing is logged and the time is ahead', () => {
    const dates = dailyReminderDates(at('2026-10-15T10:00'), '20:00', false, 3);
    expect(dates).toEqual([at('2026-10-15T20:00'), at('2026-10-16T20:00'), at('2026-10-17T20:00')]);
  });

  it('skips today once something is logged', () => {
    const dates = dailyReminderDates(at('2026-10-15T10:00'), '20:00', true, 3);
    expect(dates[0]).toEqual(at('2026-10-16T20:00'));
    expect(dates).toHaveLength(2);
  });

  it('skips today after the time', () => {
    expect(dailyReminderDates(at('2026-10-15T21:00'), '20:00', false, 2)).toEqual([
      at('2026-10-16T20:00'),
    ]);
  });
});

describe('billAlertDate', () => {
  it('is the morning before the due day', () => {
    expect(billAlertDate(at('2026-10-20T00:00'), at('2026-10-15T10:00'), '22:00', '07:00')).toEqual(
      at('2026-10-19T09:00'),
    );
  });

  it('waits for quiet hours to end', () => {
    expect(billAlertDate(at('2026-10-20T00:00'), at('2026-10-15T10:00'), '08:00', '10:00')).toEqual(
      at('2026-10-19T10:00'),
    );
  });

  it('is null once past', () => {
    expect(billAlertDate(at('2026-10-16T00:00'), at('2026-10-15T10:00'), '22:00', '07:00')).toBe(
      null,
    );
  });
});

describe('budgetAlerts', () => {
  const base = { id: 'b', name: 'Food', limit: 100_000, alertAt: 80, periodFrom: at('2026-10-01') };

  it('warns at the alert level and at 100%, keyed by period', () => {
    expect(budgetAlerts([{ ...base, spent: 50_000 }])).toEqual([]);
    expect(budgetAlerts([{ ...base, spent: 85_000 }])[0]?.key).toBe('budget:b:2026-10-01:80');
    expect(budgetAlerts([{ ...base, spent: 100_000 }])[0]?.key).toBe('budget:b:2026-10-01:100');
  });
});

describe('goalAlerts', () => {
  it('reports the highest milestone reached', () => {
    const goal = { id: 'g', name: 'Laptop', target: 2_000_000 };
    expect(goalAlerts([{ ...goal, saved: 400_000 }])).toEqual([]);
    expect(goalAlerts([{ ...goal, saved: 1_100_000 }])[0]?.key).toBe('goal:g:50');
    expect(goalAlerts([{ ...goal, saved: 2_000_000 }])[0]?.title).toBe('Laptop goal reached');
  });
});
