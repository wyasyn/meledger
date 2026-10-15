import { formatMoney } from '@meledger/shared';
import { format, isSameDay } from 'date-fns';

import { type BudgetLike, budgetStatus, type PlanTransaction, savedByGoal } from '../plan/logic';

import { billAlertDate, budgetAlerts, dailyReminderDates, goalAlerts } from './logic';
import type { NotificationPlan, ScheduledReminder } from './notifications';

export interface NotificationSettings {
  reminderOn: boolean;
  reminderTime: string;
  billAlerts: boolean;
  budgetAlerts: boolean;
  goalAlerts: boolean;
  quietStart: string;
  quietEnd: string;
}

export interface NotificationInput {
  settings: NotificationSettings;
  /** When each entry was logged (not when it happened), to skip the reminder on logged days. */
  loggedAt: readonly Date[];
  transactions: readonly PlanTransaction[];
  categoryNames: ReadonlyMap<string, string>;
  budgets: readonly (BudgetLike & { id: string })[];
  goals: readonly { id: string; name: string; targetAmount: number; status: string }[];
  contributions: readonly { goalId: string; amount: number }[];
  bills: readonly { id: string; name: string; nextDueAt: Date; amount: number | null }[];
}

/** Everything that should be scheduled or sent, from the user's data and settings. */
export function buildNotificationPlan(input: NotificationInput, now: Date): NotificationPlan {
  const { settings } = input;
  const scheduled: ScheduledReminder[] = [];

  if (settings.reminderOn) {
    const loggedToday = input.loggedAt.some((d) => isSameDay(d, now));
    for (const date of dailyReminderDates(now, settings.reminderTime, loggedToday)) {
      scheduled.push({
        identifier: `daily:${format(date, 'yyyy-MM-dd')}`,
        date,
        title: 'Anything to log today?',
        body: 'Say it in a few words and MeLedger keeps track.',
        channel: 'daily',
      });
    }
  }

  if (settings.billAlerts) {
    for (const bill of input.bills) {
      const date = billAlertDate(bill.nextDueAt, now, settings.quietStart, settings.quietEnd);
      if (!date) continue;
      scheduled.push({
        identifier: `bill:${bill.id}:${format(bill.nextDueAt, 'yyyy-MM-dd')}`,
        date,
        title: `${bill.name || 'A bill'} is due tomorrow`,
        body: bill.amount
          ? `${formatMoney(bill.amount)} due ${format(bill.nextDueAt, 'EEEE d MMM')}.`
          : `Due ${format(bill.nextDueAt, 'EEEE d MMM')}.`,
        channel: 'alerts',
      });
    }
  }

  const alerts = [];
  if (settings.budgetAlerts) {
    alerts.push(
      ...budgetAlerts(
        input.budgets.flatMap((b) => {
          const status = budgetStatus(b, input.transactions, now);
          if (!status.period) return [];
          return [
            {
              id: b.id,
              name: input.categoryNames.get(b.categoryId) ?? 'Budget',
              spent: status.spent,
              limit: status.limit,
              alertAt: b.alertAt,
              periodFrom: status.period.from,
            },
          ];
        }),
      ),
    );
  }
  if (settings.goalAlerts) {
    const saved = savedByGoal(input.contributions);
    alerts.push(
      ...goalAlerts(
        input.goals
          .filter((g) => g.status !== 'archived')
          .map((g) => ({
            id: g.id,
            name: g.name,
            saved: saved.get(g.id) ?? 0,
            target: g.targetAmount,
          })),
      ),
    );
  }

  return { scheduled, alerts, quietStart: settings.quietStart, quietEnd: settings.quietEnd };
}
