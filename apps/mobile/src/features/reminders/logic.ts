import { formatMoney } from '@meledger/shared';
import { addDays, format, startOfDay } from 'date-fns';

/** Minutes after midnight for "HH:mm". */
export function parseTime(time: string): number {
  const [h = 0, m = 0] = time.split(':').map(Number);
  return h * 60 + m;
}

const minutesOf = (date: Date) => date.getHours() * 60 + date.getMinutes();

/** Whether `date` falls in quiet hours. The range may cross midnight (22:00 to 07:00). */
export function inQuietHours(date: Date, start: string, end: string): boolean {
  const t = minutesOf(date);
  const s = parseTime(start);
  const e = parseTime(end);
  if (s === e) return false;
  return s < e ? t >= s && t < e : t >= s || t < e;
}

/** `date`, or the end of quiet hours when `date` falls inside them. */
export function outsideQuietHours(date: Date, start: string, end: string): Date {
  if (!inQuietHours(date, start, end)) return date;
  const e = parseTime(end);
  const sameDay = new Date(startOfDay(date).getTime() + e * 60_000);
  return sameDay > date ? sameDay : addDays(sameDay, 1);
}

/**
 * When the daily reminder should fire over the next `days` days: at `time` each day, skipping
 * today when something was already logged today or the time has passed.
 */
export function dailyReminderDates(
  now: Date,
  time: string,
  loggedToday: boolean,
  days = 7,
): Date[] {
  const at = parseTime(time);
  const dates: Date[] = [];
  for (let i = 0; i < days; i += 1) {
    const day = startOfDay(addDays(now, i));
    const when = new Date(day.getTime() + at * 60_000);
    if (i === 0 && (loggedToday || when <= now)) continue;
    dates.push(when);
  }
  return dates;
}

/** Bills are announced at this time the day before they are due. */
export const BILL_ALERT_TIME = '09:00';

/** The day before `dueAt` at 09:00 (moved out of quiet hours), or null when already past. */
export function billAlertDate(
  dueAt: Date,
  now: Date,
  quietStart: string,
  quietEnd: string,
): Date | null {
  const day = startOfDay(addDays(dueAt, -1));
  const when = outsideQuietHours(
    new Date(day.getTime() + parseTime(BILL_ALERT_TIME) * 60_000),
    quietStart,
    quietEnd,
  );
  return when > now ? when : null;
}

/** A one-off alert, sent once per key. */
export interface Alert {
  key: string;
  title: string;
  body: string;
}

export interface BudgetAlertInput {
  id: string;
  name: string;
  spent: number;
  limit: number;
  /** Warning level in percent (the budget's alert setting, 80 by default). */
  alertAt: number;
  /** Start of the budget's current period, so each period alerts again. */
  periodFrom: Date;
}

/** Budget warnings due now: at the alert level and at 100%, once per period. */
export function budgetAlerts(budgets: readonly BudgetAlertInput[]): Alert[] {
  const alerts: Alert[] = [];
  for (const b of budgets) {
    if (b.limit <= 0) continue;
    const pct = (b.spent / b.limit) * 100;
    const period = format(b.periodFrom, 'yyyy-MM-dd');
    if (pct >= 100) {
      alerts.push({
        key: `budget:${b.id}:${period}:100`,
        title: `${b.name} budget used up`,
        body: `You've spent ${formatMoney(b.spent)} of ${formatMoney(b.limit)}.`,
      });
    } else if (pct >= b.alertAt) {
      alerts.push({
        key: `budget:${b.id}:${period}:${b.alertAt}`,
        title: `${b.name} budget at ${Math.floor(pct)}%`,
        body: `${formatMoney(b.limit - b.spent)} left of ${formatMoney(b.limit)}.`,
      });
    }
  }
  return alerts;
}

export const GOAL_MILESTONES = [25, 50, 75, 100] as const;

export interface GoalAlertInput {
  id: string;
  name: string;
  saved: number;
  target: number;
}

/** The highest goal milestone reached, per goal. */
export function goalAlerts(goals: readonly GoalAlertInput[]): Alert[] {
  const alerts: Alert[] = [];
  for (const g of goals) {
    if (g.target <= 0) continue;
    const pct = (g.saved / g.target) * 100;
    const reached = [...GOAL_MILESTONES].reverse().find((m) => pct >= m);
    if (!reached) continue;
    alerts.push({
      key: `goal:${g.id}:${reached}`,
      title: reached === 100 ? `${g.name} goal reached` : `${g.name} goal ${reached}% there`,
      body:
        reached === 100
          ? `You've saved ${formatMoney(g.saved)}. Well done!`
          : `${formatMoney(g.saved)} saved of ${formatMoney(g.target)}.`,
    });
  }
  return alerts;
}
