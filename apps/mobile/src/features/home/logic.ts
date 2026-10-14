import {
  addDays,
  addMonths,
  format,
  isSameYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';

/** Date range shown on Home. `to` is exclusive (start of the day after the last day). */
export interface Period {
  kind: 'month' | 'week' | 'custom';
  from: Date;
  to: Date;
}

export type PeriodPreset = 'this_month' | 'last_month' | 'this_week';

export const PRESET_LABELS: Record<PeriodPreset, string> = {
  this_month: 'This month',
  last_month: 'Last month',
  this_week: 'This week',
};

export function monthPeriod(date: Date): Period {
  const from = startOfMonth(date);
  return { kind: 'month', from, to: addMonths(from, 1) };
}

/** Weeks start on Monday. */
export function weekPeriod(date: Date): Period {
  const from = startOfWeek(date, { weekStartsOn: 1 });
  return { kind: 'week', from, to: addDays(from, 7) };
}

/** Both days inclusive, in either order. */
export function customPeriod(first: Date, last: Date): Period {
  const [a, b] = first <= last ? [first, last] : [last, first];
  return { kind: 'custom', from: startOfDay(a), to: addDays(startOfDay(b), 1) };
}

export function presetPeriod(preset: PeriodPreset, now: Date): Period {
  switch (preset) {
    case 'this_month':
      return monthPeriod(now);
    case 'last_month':
      return monthPeriod(subMonths(now, 1));
    case 'this_week':
      return weekPeriod(now);
  }
}

/** The preset this period matches today, if any. */
export function presetOf(period: Period, now: Date): PeriodPreset | null {
  const presets = Object.keys(PRESET_LABELS) as PeriodPreset[];
  return (
    presets.find((preset) => {
      const p = presetPeriod(preset, now);
      return (
        p.kind === period.kind &&
        p.from.getTime() === period.from.getTime() &&
        p.to.getTime() === period.to.getTime()
      );
    }) ?? null
  );
}

/** Last day included in the period. */
export function lastDay(period: Period): Date {
  return addDays(period.to, -1);
}

/** "October 2026", "14 Oct 2026", "12 to 18 Oct 2026", "28 Sep to 4 Oct 2026". */
export function periodLabel(period: Period): string {
  if (period.kind === 'month') return format(period.from, 'MMMM yyyy');
  const first = period.from;
  const last = lastDay(period);
  if (first.getTime() === last.getTime()) return format(first, 'd MMM yyyy');
  if (!isSameYear(first, last))
    return `${format(first, 'd MMM yyyy')} to ${format(last, 'd MMM yyyy')}`;
  if (first.getMonth() === last.getMonth())
    return `${format(first, 'd')} to ${format(last, 'd MMM yyyy')}`;
  return `${format(first, 'd MMM')} to ${format(last, 'd MMM yyyy')}`;
}

/** Short name for the filter chip. */
export function periodChipLabel(period: Period, now: Date): string {
  const preset = presetOf(period, now);
  if (preset) return PRESET_LABELS[preset];
  return period.kind === 'custom' ? 'Custom range' : period.kind === 'week' ? 'Week' : 'Month';
}
