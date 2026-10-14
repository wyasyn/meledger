import {
  formatMoney,
  type ParseContext,
  type ParsedItem,
  type ParsedQuestion,
  periodTotals,
  type LedgerTransaction,
  type QuestionPeriod,
  type TransactionInput,
} from '@meledger/shared';
import { addDays, addMonths, addYears, format, startOfDay, startOfYear, subDays } from 'date-fns';

import { monthPeriod, type Period, weekPeriod } from '../home/logic';

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
    categories: categories.map(({ id, name, kind }) => ({ id, name, kind })),
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
  /** Loans and repayments are kept for the debts feature (milestone 4), not saved yet. */
  savable: boolean;
}

/** Turns a parsed item into a card's starting values. The time of day is now, on the heard day. */
export function toDraft(
  item: ParsedItem,
  key: string,
  mainWalletId: string | null,
  now: Date,
): VoiceDraft {
  const [y, m, d] = item.date.split('-').map(Number) as [number, number, number];
  const occurredAt = new Date(now);
  occurredAt.setFullYear(y, m - 1, d);
  const usd = item.currency === 'USD';
  return {
    key,
    parsed: item,
    heardUsd: usd && item.amount ? item.amount / 100 : null,
    savable: item.debt === null,
    input: {
      type: item.type,
      amount: usd ? 0 : (item.amount ?? 0),
      walletId: item.walletId ?? mainWalletId ?? '',
      toWalletId: item.type === 'transfer' ? item.toWalletId : null,
      categoryId: item.type === 'transfer' ? null : item.categoryId,
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
  if (!phrase || input.type === 'transfer' || !input.categoryId) return [];
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

interface AnswerData {
  transactions: readonly (LedgerTransaction & { categoryId: string | null })[];
  categories: readonly ContextCategory[];
  wallets: readonly { id: string; name: string }[];
  balances: ReadonlyMap<string, number>;
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
