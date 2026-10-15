import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { parseTemplate } from '@/features/plan/logic';
import { usePlanData, usePlanTransactions } from '@/features/plan/usePlanData';
import { useProfile } from '@/features/profile/repo';
import { useLedgerData } from '@/features/transactions/useLedgerData';

import { applyNotificationPlan } from './notifications';
import { buildNotificationPlan } from './plan';

/** Waits for a burst of changes (saving several entries) to settle before re-planning. */
const SETTLE_MS = 1500;

/**
 * Mounted once the user is onboarded. Keeps the phone's notifications in line with the data:
 * re-plans after every change and whenever the app comes back to the foreground (a new day).
 * Renders nothing.
 */
export function NotificationSync() {
  const profile = useProfile();
  const ledger = useLedgerData();
  const plan = usePlanData();
  const transactions = usePlanTransactions(ledger);
  const [foregrounds, setForegrounds] = useState(0);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setForegrounds((n) => n + 1);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!profile?.onboardingDone || !ledger || !plan) return;
    const timer = setTimeout(() => {
      const now = new Date();
      const notificationPlan = buildNotificationPlan(
        {
          settings: profile,
          loggedAt: ledger.transactions.map((tx) => tx.createdAt),
          transactions,
          categoryNames: new Map(ledger.categories.map((c) => [c.id, c.name])),
          budgets: plan.budgets,
          goals: plan.goals,
          contributions: plan.contributions,
          bills: plan.recurring.map((r) => ({
            id: r.id,
            name: r.name,
            nextDueAt: r.nextDueAt,
            amount: parseTemplate(r.template)?.amount ?? null,
          })),
        },
        now,
      );
      applyNotificationPlan(notificationPlan, now).catch((e: unknown) =>
        console.warn('notifications', e),
      );
    }, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [profile, ledger, plan, transactions, foregrounds]);

  return null;
}
