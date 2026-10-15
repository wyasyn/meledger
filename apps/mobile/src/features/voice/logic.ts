import {
  formatMoney,
  type ParseContext,
  type ParsedItem,
  type ParsedQuestion,
  periodTotals,
  type LedgerTransaction,
  type QuestionPeriod,
  SAVINGS_GROUP_CATEGORY_ID,
  type TransactionInput,
} from '@meledger/shared';
import { addDays, addMonths, addYears, format, startOfDay, startOfYear, subDays } from 'date-fns';

import { monthPeriod, type Period, weekPeriod } from '../home/logic';
import {
  type BudgetLike,
  budgetPeriodLabel,
  budgetStatus,
  debtCategory,
  debtFromKind,
  goalBandText,
  goalProgress,
} from '../plan/logic';

interface ContextWallet {
  id: string;
  name: string;
  type: ParseContext['wallets'][number]['type'];
  provider: string | null;
  archived: boolean;
}

interface ContextCategory {
  id: string;
  name: string;
  kind: 'income' | 'expense';
  hidden?: boolean;
}

/** Local calendar day as `YYYY-MM-DD` (the parser's date format). */
export const isoDay = (date: Date) => format(date, 'yyyy-MM-dd');

/** What the parser needs to know about this user: wallets (main first), categories, learned words. */
export function buildParseContext(
  wallets: readonly ContextWallet[],
  categories: readonly ContextCategory[],
  vocabulary: ParseContext['vocabulary'],
  now: Date,
  /** Wallet for lines that name none; defaults to the main (first active) wallet. */
  defaultWalletId?: string | null,
): ParseContext {
  const active = wallets.filter((w) => !w.archived);
  return {
    today: isoDay(now),
    wallets: active.map(({ id, name, type, provider }) => ({ id, name, type, provider })),
    // Hidden categories are never matched from speech.
    categories: categories
      .filter((c) => !c.hidden)
      .map(({ id, name, kind }) => ({ id, name, kind })),
    vocabulary,
    defaultWalletId: defaultWalletId ?? active[0]?.id ?? null,
  };
}

/** One confirmation card: the editable entry plus what the parser heard. */
export interface VoiceDraft {
  key: string;
  input: TransactionInput;
  parsed: ParsedItem;
  /** A dollar amount the user said; saving needs it in UGX for now. */
  heardUsd: number | null;
  /** False for cards that can't be saved as they are. */
  savable: boolean;
  /**
   * A loan or repayment ("lent Musa 100k", "Musa paid me back 50k"): saving records the debt or
   * the repayment against it, and the category is the matching debt category.
   */
  debt: { kind: NonNullable<ParsedItem['debt']>; person: string } | null;
  /**
   * A payment to a savings group ("paid sacco 50k"): saved as a transfer into the group's wallet.
   * Holds the active groups' wallet ids, the only choices for where it goes.
   */
  groupWalletIds: string[] | null;
}

/** An active savings group a spoken payment can go to. */
export interface ContributionGroup {
  name: string;
  walletId: string;
}

/** Words that say "a savings group" without naming one. */
const GROUP_WORDS = new Set(['sacco', 'vsla', 'chama', 'savings', 'group', 'contribution']);

/**
 * The group a spoken payment is for: the one named ("paid kireka sacco 50k"), or the only one.
 * Null when there are several and none was named, so the card asks.
 */
export function matchGroup<G extends ContributionGroup>(
  heard: string,
  groups: readonly G[],
): G | null {
  const nameWords = (text: string) => words(text).filter((w) => !GROUP_WORDS.has(w));
  const said = new Set(nameWords(heard));
  let best: G | null = null;
  let bestScore = 0;
  for (const group of groups) {
    const score = nameWords(group.name).filter((w) => said.has(w)).length;
    if (score > bestScore) {
      best = group;
      bestScore = score;
    }
  }
  return best ?? (groups.length === 1 ? groups[0]! : null);
}

/** Turns a parsed item into a card's starting values. The time of day is now, on the heard day. */
export function toDraft(
  item: ParsedItem,
  key: string,
  mainWalletId: string | null,
  now: Date,
  /** Active savings groups; a payment to the savings group category goes to one of them. */
  groups: readonly ContributionGroup[] = [],
): VoiceDraft {
  const groupWallets = new Set(groups.map((g) => g.walletId));
  if (
    item.type === 'expense' &&
    !item.debt &&
    item.categoryId === SAVINGS_GROUP_CATEGORY_ID &&
    groups.length > 0 &&
    !(item.walletId && groupWallets.has(item.walletId))
  ) {
    const group = matchGroup(`${item.note} ${item.phrase}`, groups);
    const contribution: ParsedItem = {
      ...item,
      type: 'transfer',
      toWalletId: group?.walletId ?? null,
      categoryId: null,
      note: group ? `${group.name} contribution` : item.note,
      uncertain: item.uncertain.filter((f) => f !== 'category' && f !== 'type'),
    };
    return { ...toDraft(contribution, key, mainWalletId, now), groupWalletIds: [...groupWallets] };
  }

  const [y, m, d] = item.date.split('-').map(Number) as [number, number, number];
  const occurredAt = new Date(now);
  occurredAt.setFullYear(y, m - 1, d);
  const usd = item.currency === 'USD';
  const debt = item.debt && item.person ? { kind: item.debt, person: item.person } : null;
  const debtInfo = debt ? debtFromKind(debt.kind) : null;
  return {
    key,
    parsed: item,
    heardUsd: usd && item.amount ? item.amount / 100 : null,
    savable: true,
    debt,
    groupWalletIds: null,
    input: {
      type: item.type,
      amount: usd ? 0 : (item.amount ?? 0),
      walletId: item.walletId ?? mainWalletId ?? '',
      toWalletId: item.type === 'transfer' ? item.toWalletId : null,
      categoryId: debtInfo
        ? debtCategory(debtInfo.direction, debtInfo.repayment)
        : item.type === 'transfer'
          ? null
          : item.categoryId,
      occurredAt,
      note: item.note,
      feeAmount: item.feeAmount,
      tagIds: [],
    },
  };
}

/**
 * A card for values that were not heard: a typed entry or an existing one being edited. Nothing
 * is flagged as uncertain and nothing is learned from it.
 */
export function draftFromInput(key: string, input: TransactionInput): VoiceDraft {
  return {
    key,
    input,
    heardUsd: null,
    savable: true,
    debt: null,
    groupWalletIds: null,
    parsed: {
      type: input.type,
      amount: input.amount || null,
      currency: 'UGX',
      walletId: input.walletId || null,
      toWalletId: input.toWalletId,
      categoryId: input.categoryId,
      date: isoDay(input.occurredAt),
      note: input.note,
      feeAmount: input.feeAmount,
      person: null,
      debt: null,
      phrase: '',
      confidence: { amount: 1, type: 1, wallet: 1, category: 1, date: 1 },
      uncertain: [],
    },
  };
}

/** An empty card for typing an entry in the voice sheet; `note` carries anything already said. */
export function blankDraft(key: string, walletId: string | null, now: Date, note = ''): VoiceDraft {
  return draftFromInput(key, {
    type: 'expense',
    amount: 0,
    walletId: walletId ?? '',
    toWalletId: null,
    categoryId: null,
    occurredAt: now,
    note: note.slice(0, 200),
    feeAmount: 0,
    tagIds: [],
  });
}

export interface Learning {
  phrase: string;
  targetType: 'category';
  targetId: string;
}

/**
 * What to remember when the user corrected a card before saving (build prompt section 6.3):
 * the words that were heard now mean the category they picked.
 */
export function learningsFor(draft: VoiceDraft): Learning[] {
  const { input, parsed } = draft;
  const phrase = parsed.phrase.trim().toLowerCase();
  if (!phrase || draft.debt || input.type === 'transfer' || !input.categoryId) return [];
  if (input.categoryId === parsed.categoryId) return [];
  return [{ phrase, targetType: 'category', targetId: input.categoryId }];
}

// ---------------------------------------------------------------------------------------------
// Answers to questions, worked out locally (build prompt section 6.4)

export function questionPeriod(period: QuestionPeriod, now: Date): Period {
  const today = startOfDay(now);
  switch (period) {
    case 'today':
      return { kind: 'custom', from: today, to: addDays(today, 1) };
    case 'yesterday':
      return { kind: 'custom', from: subDays(today, 1), to: today };
    case 'this_week':
      return weekPeriod(now);
    case 'last_week':
      return weekPeriod(subDays(now, 7));
    case 'this_month':
      return monthPeriod(now);
    case 'last_month':
      return monthPeriod(addMonths(now, -1));
    case 'this_year': {
      const from = startOfYear(now);
      return { kind: 'custom', from, to: addYears(from, 1) };
    }
  }
}

const PERIOD_WORDS: Record<QuestionPeriod, string> = {
  today: 'today',
  yesterday: 'yesterday',
  this_week: 'this week',
  last_week: 'last week',
  this_month: 'this month',
  last_month: 'last month',
  this_year: 'this year',
};

export interface AnswerRow {
  label: string;
  amount: number;
}

export interface Answer {
  /** One spoken-style sentence with the figure. */
  text: string;
  /** Extra lines, e.g. the top categories. */
  rows: AnswerRow[];
}

interface AnswerGoal {
  id: string;
  name: string;
  targetAmount: number;
  targetDate: Date | null;
  createdAt: Date;
  saved: number;
}

interface AnswerData {
  transactions: readonly (LedgerTransaction & { categoryId: string | null })[];
  categories: readonly ContextCategory[];
  wallets: readonly { id: string; name: string }[];
  balances: ReadonlyMap<string, number>;
  budgets: readonly BudgetLike[];
  /** Goals that are not archived. */
  goals: readonly AnswerGoal[];
}

/** "this month", "this week", or a custom budget's dates in brackets. */
function budgetWhen(budget: BudgetLike, now: Date): string {
  const label = budgetPeriodLabel(budget, now);
  return budget.period === 'custom' ? `(${label})` : label.toLowerCase();
}

function answerBudget(q: ParsedQuestion, data: AnswerData, now: Date): Answer {
  const name = (categoryId: string) =>
    data.categories.find((c) => c.id === categoryId)?.name ?? 'No category';
  const asked = q.categoryId ? data.budgets.filter((b) => b.categoryId === q.categoryId) : [];
  if (q.categoryId && asked.length === 0) {
    return { text: `You haven't set a budget for ${name(q.categoryId)} yet.`, rows: [] };
  }
  const budgets = q.categoryId ? asked : data.budgets;
  if (budgets.length === 0) return { text: "You haven't set any budgets yet.", rows: [] };

  const statuses = budgets.map((b) => ({
    budget: b,
    status: budgetStatus(b, data.transactions, now),
  }));
  if (statuses.length === 1) {
    const { budget, status } = statuses[0]!;
    const what = `your ${name(budget.categoryId)} budget ${budgetWhen(budget, now)}`;
    const text =
      status.remaining > 0
        ? `You have ${formatMoney(status.remaining)} left of ${formatMoney(status.limit)} in ${what}.`
        : status.remaining === 0
          ? `You've used all of ${what}.`
          : `You're ${formatMoney(-status.remaining)} over ${what}.`;
    return { text, rows: [] };
  }
  const over = statuses.filter((s) => s.status.remaining < 0).length;
  return {
    text:
      over === 0
        ? `Here's what's left in your ${statuses.length} budgets.`
        : `Here's what's left in your ${statuses.length} budgets. ${over} ${over === 1 ? 'is' : 'are'} over.`,
    rows: statuses.map(({ budget, status }) => ({
      label:
        status.remaining < 0 ? `${name(budget.categoryId)} (over by)` : name(budget.categoryId),
      amount: Math.abs(status.remaining),
    })),
  };
}

function answerGoal(q: ParsedQuestion, data: AnswerData, now: Date): Answer {
  if (data.goals.length === 0) return { text: "You haven't set any goals yet.", rows: [] };
  const goal = q.goal
    ? matchGoal(q.goal, data.goals)
    : data.goals.length === 1
      ? data.goals[0]!
      : null;
  if (goal) {
    const p = goalProgress(goal, goal.saved, now);
    if (p.schedule === 'done') {
      return {
        text: `You've reached your ${goal.name} goal: ${formatMoney(p.saved)} saved. Well done!`,
        rows: [],
      };
    }
    const band = goalBandText(p, goal.targetDate);
    const percent = Math.round(p.ratio * 100);
    return {
      text: `You've saved ${formatMoney(p.saved)} of ${formatMoney(p.target)} for ${goal.name} (${percent}%).${band ? ` ${band}` : ''}`,
      rows: [{ label: 'Left to save', amount: p.left }],
    };
  }
  const progress = data.goals.map((g) => ({ goal: g, p: goalProgress(g, g.saved, now) }));
  const behind = progress.filter(({ p }) => p.schedule === 'behind' || p.schedule === 'overdue');
  const saved = progress.reduce((sum, { p }) => sum + p.saved, 0);
  return {
    text:
      `You've saved ${formatMoney(saved)} across your ${progress.length} goals.` +
      (behind.length > 0
        ? ` ${behind.length} ${behind.length === 1 ? 'is' : 'are'} behind schedule.`
        : ''),
    rows: progress.map(({ goal: g, p }) => ({
      label: `${g.name} (${Math.round(p.ratio * 100)}%)`,
      amount: p.saved,
    })),
  };
}

export function answerQuestion(q: ParsedQuestion, data: AnswerData, now: Date): Answer {
  const period = questionPeriod(q.period, now);
  const from = period.from.getTime();
  const to = period.to.getTime();
  const when = PERIOD_WORDS[q.period];
  const categoryName = data.categories.find((c) => c.id === q.categoryId)?.name;
  const walletName = data.wallets.find((w) => w.id === q.walletId)?.name;
  const inScope = data.transactions.filter(
    (tx) =>
      (!q.walletId || tx.walletId === q.walletId) &&
      (!q.categoryId || tx.categoryId === q.categoryId),
  );

  switch (q.metric) {
    case 'budget_left':
      return answerBudget(q, data, now);
    case 'goal_progress':
      return answerGoal(q, data, now);
    case 'balance': {
      if (q.walletId) {
        const amount = data.balances.get(q.walletId) ?? 0;
        return {
          text: `You have ${formatMoney(amount)} on ${walletName ?? 'that wallet'}.`,
          rows: [],
        };
      }
      const total = data.wallets.reduce((sum, w) => sum + (data.balances.get(w.id) ?? 0), 0);
      return {
        text: `Your balance is ${formatMoney(total)} across all wallets.`,
        rows: data.wallets.map((w) => ({ label: w.name, amount: data.balances.get(w.id) ?? 0 })),
      };
    }
    case 'spent':
    case 'earned': {
      const totals = periodTotals(inScope, from, to);
      const amount = q.metric === 'spent' ? totals.expense : totals.income;
      const verb = q.metric === 'spent' ? 'spent' : 'received';
      const on = categoryName
        ? q.metric === 'spent'
          ? ` on ${categoryName}`
          : ` from ${categoryName}`
        : '';
      const via = walletName ? ` from ${walletName}` : '';
      return { text: `You ${verb} ${formatMoney(amount)}${on}${via} ${when}.`, rows: [] };
    }
    case 'top_categories': {
      const sums = new Map<string, number>();
      for (const tx of inScope) {
        if (tx.type !== 'expense' || tx.occurredAt < from || tx.occurredAt >= to) continue;
        const key = tx.categoryId ?? '';
        sums.set(key, (sums.get(key) ?? 0) + tx.amount);
      }
      const rows = [...sums.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, amount]) => ({
          label: data.categories.find((c) => c.id === id)?.name ?? 'No category',
          amount,
        }));
      const top = rows[0];
      return {
        text: top
          ? `You spent the most on ${top.label} ${when}: ${formatMoney(top.amount)}.`
          : `You haven't logged any spending ${when}.`,
        rows,
      };
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Commands (budgets and goals)

const words = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1);

/**
 * The goal a spoken contribution is for ("add 50k to my laptop goal"): the goal sharing the
 * most words with what was heard, or the only goal when nothing matches.
 */
export function matchGoal<G extends { id: string; name: string }>(
  heard: string,
  goals: readonly G[],
): G | null {
  const said = new Set(words(heard));
  let best: G | null = null;
  let bestScore = 0;
  for (const goal of goals) {
    const score = words(goal.name).filter((w) => said.has(w) || said.has(`${w}s`)).length;
    if (score > bestScore) {
      best = goal;
      bestScore = score;
    }
  }
  return best ?? (goals.length === 1 ? goals[0]! : null);
}
