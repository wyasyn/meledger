import { describe, expect, it } from 'vitest';

import { customPeriod, monthPeriod } from '../home/logic';
import {
  buckets,
  categoryBreakdown,
  changeIsGood,
  changeLabel,
  distinctColors,
  segmentAngles,
  donutSegments,
  inRow,
  previousPeriod,
  type ReportTransaction,
  TRANSFER_FEES_ID,
  UNCATEGORISED_ID,
} from './logic';

const october = monthPeriod(new Date(2026, 9, 14));
const at = (d: number, m = 9) => new Date(2026, m, d, 12).getTime();

const tx = (over: Partial<ReportTransaction>): ReportTransaction => ({
  type: 'expense',
  amount: 0,
  feeAmount: 0,
  categoryId: 'food',
  occurredAt: at(10),
  ...over,
});

const categories = [
  { id: 'food', name: 'Groceries', icon: 'groceries', color: 'green' },
  { id: 'boda', name: 'Boda/Taxi', icon: 'boda', color: 'blue' },
  { id: 'salary', name: 'Salary', icon: 'salary', color: 'green' },
];

const data: ReportTransaction[] = [
  tx({ amount: 112_000 }),
  tx({ amount: 30_000, categoryId: 'boda', occurredAt: at(2) }),
  tx({ amount: 100_000, occurredAt: at(20, 8) }),
  tx({ amount: 40_000, categoryId: 'boda', occurredAt: at(20, 8) }),
  tx({ amount: 8_000, categoryId: null, occurredAt: at(11) }),
  tx({ type: 'transfer', amount: 500_000, feeAmount: 4_400, categoryId: null, occurredAt: at(12) }),
  tx({ type: 'income', amount: 2_000_000, categoryId: 'salary', occurredAt: at(1) }),
];

describe('categoryBreakdown', () => {
  it('ranks expense categories with share and change vs last month', () => {
    const b = categoryBreakdown(data, categories, 'expense', october);
    expect(b.total).toBe(112_000 + 30_000 + 8_000 + 4_400);
    expect(b.rows.map((r) => r.id)).toEqual(['food', 'boda', UNCATEGORISED_ID, TRANSFER_FEES_ID]);
    const food = b.rows[0]!;
    expect(food.share).toBeCloseTo(112_000 / b.total);
    expect(food.change).toBeCloseTo(0.12);
    expect(b.rows[1]!.change).toBeCloseTo(-0.25);
    expect(b.rows[2]!.change).toBeNull();
    expect(b.rows[3]!.name).toBe('Transfer fees');
  });

  it('reports income without transfers or fees', () => {
    const b = categoryBreakdown(data, categories, 'income', october);
    expect(b.total).toBe(2_000_000);
    expect(b.rows).toHaveLength(1);
  });

  it('compares a custom range with the same number of days before it', () => {
    const p = previousPeriod(customPeriod(new Date(2026, 9, 8), new Date(2026, 9, 14)));
    expect(p.from).toEqual(new Date(2026, 9, 1));
    expect(p.to).toEqual(new Date(2026, 9, 8));
  });

  it('labels changes and colours them by kind', () => {
    expect(changeLabel(0.123)).toBe('+12%');
    expect(changeLabel(-0.06)).toBe('-6%');
    expect(changeIsGood(0.1, 'expense')).toBe(false);
    expect(changeIsGood(0.1, 'income')).toBe(true);
  });

  it('matches entries to their row for the drill-down', () => {
    expect(inRow(data[5]!, 'expense', TRANSFER_FEES_ID)).toBe(true);
    expect(inRow(data[4]!, 'expense', UNCATEGORISED_ID)).toBe(true);
    expect(inRow(data[0]!, 'income', 'food')).toBe(false);
  });
});

describe('donutSegments', () => {
  it('groups the tail into one Other segment', () => {
    const rows = categoryBreakdown(
      ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) => tx({ categoryId: id, amount: 600 - i * 100 })),
      [],
      'expense',
      october,
    ).rows;
    const s = donutSegments(rows, 4);
    expect(s.map((x) => x.id)).toEqual(['a', 'b', 'c', 'other']);
    expect(s[3]!.value).toBe(300 + 200 + 100);
    expect(s[3]!.other).toBe(true);
    expect(s.reduce((sum, x) => sum + x.share, 0)).toBeCloseTo(1);
  });

  it('is empty with nothing spent', () => {
    expect(donutSegments([])).toEqual([]);
  });
});

describe('buckets', () => {
  it('has one bar per day of the month', () => {
    const days = buckets(data, 'expense', october, 'day');
    expect(days).toHaveLength(31);
    expect(days[9]!.value).toBe(112_000);
    expect(days[11]!.value).toBe(4_400);
    expect(days[0]!.label).toBe('1');
  });

  it('groups by Monday weeks clipped to the month', () => {
    const weeks = buckets(data, 'expense', october, 'week');
    // 1 to 4 Oct, then weeks from 5, 12, 19 and 26 Oct.
    expect(weeks.map((w) => w.label)).toEqual(['1 Oct', '5 Oct', '12 Oct', '19 Oct', '26 Oct']);
    expect(weeks[0]!.value).toBe(30_000);
    expect(weeks[1]!.value).toBe(112_000 + 8_000);
    expect(weeks[0]!.title).toBe('1 to 4 Oct');
  });
});

describe('distinctColors', () => {
  it('keeps first colours and gives repeats the next unused one', () => {
    const rows = distinctColors([
      { color: 'green' },
      { color: 'green' },
      { color: 'blue' },
      { color: 'green' },
    ]);
    expect(rows.map((r) => r.color)).toEqual(['green', 'blue', 'orange', 'pink']);
  });
});

describe('segmentAngles', () => {
  it('keeps tiny segments visible and still fills the ring', () => {
    const angles = segmentAngles([0.995, 0.005], 20);
    expect(angles[1]).toBe(20);
    expect(angles[0]).toBeCloseTo(340);
  });

  it('leaves segments alone when all are big enough', () => {
    expect(segmentAngles([0.5, 0.25, 0.25], 20)).toEqual([180, 90, 90]);
  });
});
