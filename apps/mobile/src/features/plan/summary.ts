import { formatMoney } from '@meledger/shared';
import { format } from 'date-fns';

import type { LedgerData } from '@/features/transactions/useLedgerData';

import {
  budgetPeriodLabel,
  budgetStatus,
  debtBalance,
  dueLabel,
  goalProgress,
  groupSchedule,
  parseMembers,
  parseTemplate,
  type PlanTransaction,
  savedByGoal,
} from './logic';
import type { PlanData } from './usePlanData';

/** Plain-text summary of the plan for the share button (no notes or entry details). */
export function planSummary({
  plan,
  ledger,
  transactions,
  now,
}: {
  plan: PlanData;
  ledger: LedgerData;
  transactions: readonly PlanTransaction[];
  now: Date;
}): string {
  const categories = new Map(ledger.categories.map((c) => [c.id, c.name]));
  const saved = savedByGoal(plan.contributions);
  const lines = [`My plan · ${format(now, 'd MMMM yyyy')}`];

  if (plan.goals.length > 0) {
    lines.push('', 'Goals');
    for (const goal of plan.goals) {
      const p = goalProgress(goal, saved.get(goal.id) ?? 0, now);
      const date = goal.targetDate ? ` by ${format(goal.targetDate, 'd MMM yyyy')}` : '';
      lines.push(
        `• ${goal.name}: ${formatMoney(p.saved)} of ${formatMoney(p.target)}${date} (${Math.round(
          p.ratio * 100,
        )}%)`,
      );
    }
  }
  if (plan.budgets.length > 0) {
    lines.push('', 'Budgets');
    for (const budget of plan.budgets) {
      const s = budgetStatus(budget, transactions, now);
      lines.push(
        `• ${categories.get(budget.categoryId) ?? 'Category'} (${budgetPeriodLabel(
          budget,
          now,
        ).toLowerCase()}): ${formatMoney(s.spent)} of ${formatMoney(s.limit)}`,
      );
    }
  }
  if (plan.recurring.length > 0) {
    lines.push('', 'Recurring bills');
    for (const rule of plan.recurring) {
      const t = parseTemplate(rule.template);
      lines.push(
        `• ${rule.name}${t ? ` ${formatMoney(t.amount)}` : ''}: ${dueLabel(
          rule.nextDueAt,
          now,
        ).toLowerCase()}`,
      );
    }
  }
  const open = plan.debts.filter((d) => d.status === 'open');
  if (open.length > 0) {
    lines.push('', 'Debts & loans');
    for (const debt of open) {
      const b = debtBalance(debt, transactions);
      lines.push(
        debt.direction === 'owed_to_me'
          ? `• ${debt.person} owes me ${formatMoney(b.remaining)}`
          : `• I owe ${debt.person} ${formatMoney(b.remaining)}`,
      );
    }
  }
  const groups = plan.groups.filter((g) => !g.archived);
  if (groups.length > 0) {
    lines.push('', 'Savings groups');
    for (const group of groups) {
      const s = groupSchedule({ ...group, members: parseMembers(group.members) }, now);
      lines.push(
        `• ${group.name}: ${formatMoney(group.contributionAmount)} ${group.frequency}, next ${format(
          s.nextContribution,
          'd MMM',
        )}`,
      );
    }
  }
  return lines.join('\n');
}
