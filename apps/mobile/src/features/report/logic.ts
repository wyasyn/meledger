import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  format,
  max,
  min,
  startOfDay,
  startOfWeek,
} from 'date-fns';

import type { Period } from '../home/logic';

export type ReportKind = 'expense' | 'income';

/** The fields of an entry the report reads. Times are epoch milliseconds. */
export interface ReportTransaction {
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  feeAmount: number;
  categoryId: string | null;
  occurredAt: number;
}

export interface ReportCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

/** Pseudo categories so every shilling in Home's totals has a row. */
export const UNCATEGORISED_ID = 'uncategorised';
export const TRANSFER_FEES_ID = 'transfer-fees';

const PSEUDO: Record<string, ReportCategory> = {
  [UNCATEGORISED_ID]: {
    id: UNCATEGORISED_ID,
    name: 'No category',
    icon: 'category',
    color: 'slate',
  },
  [TRANSFER_FEES_ID]: { id: TRANSFER_FEES_ID, name: 'Transfer fees', icon: 'fees', color: 'slate' },
};

export interface CategoryRow extends ReportCategory {
  amount: number;
  /** Share of the period total, 0 to 1. */
  share: number;
  /** Same category in the previous period. */
  previous: number;
  /** Change vs the previous period as a ratio (0.12 = +12%); null when there was nothing before. */
  change: number | null;
}

/** Amount an entry adds to the report, and the row it belongs to. */
function contribution(tx: ReportTransaction, kind: ReportKind): [string, number] | null {
  if (kind === 'income') {
    return tx.type === 'income' ? [tx.categoryId ?? UNCATEGORISED_ID, tx.amount] : null;
  }
  if (tx.type === 'expense') return [tx.categoryId ?? UNCATEGORISED_ID, tx.amount];
  // Transfers only cost their fee, as on Home.
  if (tx.type === 'transfer' && tx.feeAmount > 0) return [TRANSFER_FEES_ID, tx.feeAmount];
  return null;
}

function sumByCategory(
  transactions: readonly ReportTransaction[],
  kind: ReportKind,
  from: number,
  to: number,
): Map<string, number> {
  const sums = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.occurredAt < from || tx.occurredAt >= to) continue;
    const c = contribution(tx, kind);
    if (c) sums.set(c[0], (sums.get(c[0]) ?? 0) + c[1]);
  }
  return sums;
}

/** The period just before this one: the previous month for a month, else the same length back. */
export function previousPeriod(period: Period): Period {
  if (period.kind === 'month') {
    return { kind: 'month', from: addMonths(period.from, -1), to: period.from };
  }
  const days = differenceInCalendarDays(period.to, period.from);
  return { kind: period.kind, from: addDays(period.from, -days), to: period.from };
}

export interface Breakdown {
  total: number;
  rows: CategoryRow[];
}

/** Category cards for the report, biggest first, each compared with the previous period. */
export function categoryBreakdown(
  transactions: readonly ReportTransaction[],
  categories: readonly ReportCategory[],
  kind: ReportKind,
  period: Period,
): Breakdown {
  const prev = previousPeriod(period);
  const now = sumByCategory(transactions, kind, period.from.getTime(), period.to.getTime());
  const before = sumByCategory(transactions, kind, prev.from.getTime(), prev.to.getTime());
  const byId = new Map(categories.map((c) => [c.id, c]));
  let total = 0;
  for (const amount of now.values()) total += amount;

  const rows = [...now.entries()]
    .filter(([, amount]) => amount > 0)
    .map(([id, amount]): CategoryRow => {
      const category = byId.get(id) ?? PSEUDO[id] ?? { ...PSEUDO[UNCATEGORISED_ID]!, id };
      const previous = before.get(id) ?? 0;
      return {
        ...category,
        amount,
        share: total > 0 ? amount / total : 0,
        previous,
        change: previous > 0 ? (amount - previous) / previous : null,
      };
    })
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
  return { total, rows };
}

/** "+12%", "-6%", "0%". */
export function changeLabel(change: number): string {
  const pct = Math.round(change * 100);
  return `${pct > 0 ? '+' : ''}${pct}%`;
}

/**
 * Whether a change is good news: spending less or earning more. For expenses a rise is shown in
 * red and a fall in green; for income the other way round.
 */
export const changeIsGood = (change: number, kind: ReportKind) =>
  kind === 'expense' ? change <= 0 : change >= 0;

export interface DonutSegment {
  id: string;
  label: string;
  color: string;
  value: number;
  share: number;
  /** The grouped "Other" segment, drawn hatched. */
  other: boolean;
}

/** The biggest categories as donut segments; the rest are grouped into one hatched "Other". */
export function donutSegments(rows: readonly CategoryRow[], maxSegments = 5): DonutSegment[] {
  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  if (total === 0) return [];
  const fits = rows.length <= maxSegments;
  const shown = fits ? rows : rows.slice(0, maxSegments - 1);
  const segments: DonutSegment[] = shown.map((r) => ({
    id: r.id,
    label: r.name,
    color: r.color,
    value: r.amount,
    share: r.amount / total,
    other: false,
  }));
  if (!fits) {
    const value = rows.slice(maxSegments - 1).reduce((sum, r) => sum + r.amount, 0);
    segments.push({
      id: 'other',
      label: 'Other',
      color: 'slate',
      value,
      share: value / total,
      other: true,
    });
  }
  return segments;
}

export type BarGrouping = 'day' | 'week';

/** A type alias (not an interface) so it fits the chart's Record data type. */
export type Bucket = {
  /** Start of the bucket (epoch ms), used as the bar's x value. */
  x: number;
  /** Axis label: "12" for a day, "12 Oct" for a week. */
  label: string;
  /** Tooltip title: "Mon 12 Oct" or "12 to 18 Oct". */
  title: string;
  value: number;
};

/**
 * Totals per day, or per week (Monday start) clipped to the period, for the bar chart. Periods
 * longer than the bars that fit are still bucketed in full; the chart decides how to label them.
 */
export function buckets(
  transactions: readonly ReportTransaction[],
  kind: ReportKind,
  period: Period,
  grouping: BarGrouping,
): Bucket[] {
  const result: Bucket[] = [];
  const index = new Map<number, Bucket>();
  let cursor = startOfDay(period.from);
  while (cursor < period.to) {
    const start =
      grouping === 'day' ? cursor : max([startOfWeek(cursor, { weekStartsOn: 1 }), period.from]);
    const end =
      grouping === 'day'
        ? addDays(cursor, 1)
        : min([addDays(startOfWeek(cursor, { weekStartsOn: 1 }), 7), period.to]);
    const last = addDays(end, -1);
    const bucket: Bucket = {
      x: start.getTime(),
      label: grouping === 'day' ? format(start, 'd') : format(start, 'd MMM'),
      title:
        grouping === 'day' || start.getTime() === last.getTime()
          ? format(start, 'EEE d MMM')
          : start.getMonth() === last.getMonth()
            ? `${format(start, 'd')} to ${format(last, 'd MMM')}`
            : `${format(start, 'd MMM')} to ${format(last, 'd MMM')}`,
      value: 0,
    };
    result.push(bucket);
    index.set(bucket.x, bucket);
    cursor = end;
  }
  const from = period.from.getTime();
  const to = period.to.getTime();
  for (const tx of transactions) {
    if (tx.occurredAt < from || tx.occurredAt >= to) continue;
    const c = contribution(tx, kind);
    if (!c) continue;
    const day = startOfDay(tx.occurredAt);
    const start =
      grouping === 'day' ? day : max([startOfWeek(day, { weekStartsOn: 1 }), period.from]);
    const bucket = index.get(start.getTime());
    if (bucket) bucket.value += c[1];
  }
  return result;
}

/** Entries of one report row in the period, for the category drill-down. */
export function inRow(tx: ReportTransaction, kind: ReportKind, rowId: string): boolean {
  const c = contribution(tx, kind);
  return c !== null && c[0] === rowId;
}

const PALETTE_ORDER = ['blue', 'green', 'orange', 'pink', 'teal', 'amber', 'lime', 'slate'];

/**
 * Gives each report row its own colour. Categories in the same group share a colour
 * (all Food is green), which would put identical segments side by side in the donut; a repeat
 * takes the next unused palette colour instead. The cards use the same colours as the chart.
 */
export function distinctColors<R extends { color: string }>(rows: readonly R[]): R[] {
  const used = new Set<string>();
  return rows.map((row) => {
    let color = row.color;
    if (used.has(color)) color = PALETTE_ORDER.find((c) => !used.has(c)) ?? row.color;
    used.add(color);
    return color === row.color ? row : { ...row, color };
  });
}

/**
 * Sweep angles (degrees, summing to 360) for donut segments. Every segment gets at least
 * `minDeg`, so a tiny category still shows as a visible slice; the room comes from the bigger
 * segments in proportion to their size.
 */
export function segmentAngles(shares: readonly number[], minDeg: number): number[] {
  const raw = shares.map((s) => s * 360);
  if (raw.length * minDeg >= 360) return raw.map(() => 360 / raw.length);
  const small = raw.map((a) => a < minDeg);
  const needed = raw.reduce((sum, a, i) => sum + (small[i] ? minDeg - a : 0), 0);
  const bigTotal = raw.reduce((sum, a, i) => sum + (small[i] ? 0 : a), 0);
  return raw.map((a, i) => (small[i] ? minDeg : a - (needed * a) / bigTotal));
}
