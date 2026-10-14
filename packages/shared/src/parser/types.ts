import { z } from 'zod';

import { CURRENCIES } from '../money';
import { TRANSACTION_TYPES, WALLET_TYPES } from '../schemas';

/** What the user asked for (build prompt section 6.1). */
export const PARSE_INTENTS = [
  'log',
  'question',
  'set_budget',
  'set_goal',
  'add_reminder',
  'contribute_goal',
  'unknown',
] as const;
export type ParseIntent = (typeof PARSE_INTENTS)[number];

/** Fields of a parsed item that carry a confidence score. */
export const PARSE_FIELDS = ['amount', 'type', 'wallet', 'category', 'date'] as const;
export type ParseField = (typeof PARSE_FIELDS)[number];

/** Below this confidence a field is shown as uncertain on the confirmation card. */
export const UNCERTAIN_BELOW = 0.7;

export const DEBT_KINDS = ['lend', 'borrow', 'repaid_to_me', 'repay'] as const;
export type DebtKind = (typeof DEBT_KINDS)[number];

/** Named periods for questions; the app turns them into date ranges. */
export const QUESTION_PERIODS = [
  'today',
  'yesterday',
  'this_week',
  'last_week',
  'this_month',
  'last_month',
  'this_year',
] as const;
export type QuestionPeriod = (typeof QUESTION_PERIODS)[number];

export const QUESTION_METRICS = ['spent', 'earned', 'balance', 'top_categories'] as const;
export type QuestionMetric = (typeof QUESTION_METRICS)[number];

const currencyCodes = Object.keys(CURRENCIES) as [keyof typeof CURRENCIES];
/** Calendar date in the user's local time, `YYYY-MM-DD`. */
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const confidence = z.number().min(0).max(1);

export const ParsedItemSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  /** Integer minor units, or null when no amount was heard. */
  amount: z.number().int().positive().nullable(),
  currency: z.enum(currencyCodes),
  walletId: z.string().nullable(),
  toWalletId: z.string().nullable(),
  categoryId: z.string().nullable(),
  date: isoDate,
  note: z.string(),
  feeAmount: z.number().int().nonnegative(),
  /** Name of the person in a debt or a payment to someone, as heard. */
  person: z.string().nullable(),
  /** Set when the item is a loan or a repayment rather than plain spending or income. */
  debt: z.enum(DEBT_KINDS).nullable(),
  /** The words that chose the category (or the item's words), used for vocabulary learning. */
  phrase: z.string(),
  confidence: z.object({
    amount: confidence,
    type: confidence,
    wallet: confidence,
    category: confidence,
    date: confidence,
  }),
  uncertain: z.array(z.enum(PARSE_FIELDS)),
});
export type ParsedItem = z.infer<typeof ParsedItemSchema>;

export const ParsedQuestionSchema = z.object({
  metric: z.enum(QUESTION_METRICS),
  categoryId: z.string().nullable(),
  walletId: z.string().nullable(),
  period: z.enum(QUESTION_PERIODS),
});
export type ParsedQuestion = z.infer<typeof ParsedQuestionSchema>;

export const ParsedCommandSchema = z.object({
  categoryId: z.string().nullable(),
  amount: z.number().int().positive().nullable(),
  currency: z.enum(currencyCodes),
  date: isoDate.nullable(),
  /** Goal name or reminder text, as heard. */
  text: z.string(),
});
export type ParsedCommand = z.infer<typeof ParsedCommandSchema>;

export const ParseResultSchema = z.object({
  intent: z.enum(PARSE_INTENTS),
  transcript: z.string(),
  items: z.array(ParsedItemSchema),
  /** Set for `question`; null when the question shape is not one the app can answer locally. */
  question: ParsedQuestionSchema.nullable(),
  /** Set for `set_budget`, `set_goal`, `add_reminder` and `contribute_goal`. */
  command: ParsedCommandSchema.nullable(),
  /** True when every item has a confident amount and type (the local result can be used as is). */
  confident: z.boolean(),
});
export type ParseResult = z.infer<typeof ParseResultSchema>;

export interface ParseContextWallet {
  id: string;
  name: string;
  type: (typeof WALLET_TYPES)[number];
  provider: string | null;
}

export interface ParseContextCategory {
  id: string;
  name: string;
  kind: 'income' | 'expense';
}

export interface ParseContextVocabulary {
  phrase: string;
  targetType: 'category' | 'wallet' | 'person';
  targetId: string;
}

export interface ParseContext {
  /** Today in the user's local time, `YYYY-MM-DD`. */
  today: string;
  /** Active wallets, main wallet first. */
  wallets: readonly ParseContextWallet[];
  categories: readonly ParseContextCategory[];
  vocabulary: readonly ParseContextVocabulary[];
  /** Wallet used when none is named; defaults to the first wallet. */
  defaultWalletId?: string | null;
  baseCurrency?: keyof typeof CURRENCIES;
}
