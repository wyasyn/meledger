import { z } from 'zod';

import { CATEGORY_COLORS } from './categories';
import { CURRENCIES } from './money';

export const WALLET_TYPES = ['cash', 'mobile_money', 'bank', 'card', 'savings'] as const;
export type WalletType = (typeof WALLET_TYPES)[number];

export const TRANSACTION_TYPES = ['expense', 'income', 'transfer'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_SOURCES = ['voice', 'keyboard', 'shared_sms', 'receipt'] as const;
export type TransactionSource = (typeof TRANSACTION_SOURCES)[number];

const currencyCodes = Object.keys(CURRENCIES) as [keyof typeof CURRENCIES];
const colorKeys = Object.keys(CATEGORY_COLORS) as [keyof typeof CATEGORY_COLORS];

/** Integer minor units (UGX = whole shillings). */
const minorAmount = z.number().int();

export const WalletInputSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(40, 'Keep it under 40 characters'),
  type: z.enum(WALLET_TYPES),
  provider: z.string().trim().max(40).nullable(),
  currency: z.enum(currencyCodes),
  openingBalance: minorAmount,
  color: z.enum(colorKeys),
});
export type WalletInput = z.infer<typeof WalletInputSchema>;

export const TagInputSchema = z.object({
  name: z.string().trim().min(1, 'Enter a tag').max(24, 'Keep it under 24 characters'),
});

export const TransactionInputSchema = z
  .object({
    type: z.enum(TRANSACTION_TYPES),
    amount: minorAmount.positive('Enter an amount'),
    walletId: z.string().min(1, 'Choose a wallet'),
    toWalletId: z.string().nullable(),
    categoryId: z.string().nullable(),
    occurredAt: z.date(),
    note: z.string().trim().max(200, 'Keep the note under 200 characters'),
    feeAmount: minorAmount.nonnegative(),
    tagIds: z.array(z.string()),
  })
  .superRefine((tx, ctx) => {
    if (tx.type === 'transfer') {
      if (!tx.toWalletId) {
        ctx.addIssue({ code: 'custom', path: ['toWalletId'], message: 'Choose where it goes' });
      } else if (tx.toWalletId === tx.walletId) {
        ctx.addIssue({ code: 'custom', path: ['toWalletId'], message: 'Pick a different wallet' });
      }
    } else if (!tx.categoryId) {
      ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'Choose a category' });
    }
  });
export type TransactionInput = z.infer<typeof TransactionInputSchema>;

// ---------------------------------------------------------------------------------------------
// Plan (build prompt section 5.5)

export const BUDGET_PERIODS = ['monthly', 'weekly', 'custom'] as const;
export type BudgetPeriodKind = (typeof BUDGET_PERIODS)[number];

export const BudgetInputSchema = z
  .object({
    categoryId: z.string().min(1, 'Choose a category'),
    period: z.enum(BUDGET_PERIODS),
    limitAmount: minorAmount.positive('Enter a limit'),
    /** Percent of the limit that triggers the "almost there" warning. */
    alertAt: z.number().int().min(1).max(100),
    /** Custom budgets: first day, and the day after the last (exclusive). */
    startsAt: z.date().nullable(),
    endsAt: z.date().nullable(),
  })
  .superRefine((b, ctx) => {
    if (b.period !== 'custom') return;
    if (!b.startsAt || !b.endsAt) {
      ctx.addIssue({ code: 'custom', path: ['startsAt'], message: 'Choose the dates' });
    } else if (b.endsAt <= b.startsAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['startsAt'],
        message: 'The end must be after the start',
      });
    }
  });
export type BudgetInput = z.infer<typeof BudgetInputSchema>;

export const CategoryInputSchema = z.object({
  name: z.string().trim().min(1, 'Name the category').max(30, 'Keep it under 30 characters'),
  kind: z.enum(['income', 'expense']),
  icon: z.string().min(1),
  color: z.enum(colorKeys),
});
export type CategoryInput = z.infer<typeof CategoryInputSchema>;

export const GOAL_STATUSES = ['active', 'done', 'archived'] as const;

export const GoalInputSchema = z.object({
  name: z.string().trim().min(1, 'Name your goal').max(40, 'Keep it under 40 characters'),
  icon: z.string().min(1),
  color: z.enum(colorKeys),
  targetAmount: minorAmount.positive('Enter a target'),
  targetDate: z.date().nullable(),
});
export type GoalInput = z.infer<typeof GoalInputSchema>;

export const ContributionInputSchema = z.object({
  amount: minorAmount.positive('Enter an amount'),
  occurredAt: z.date(),
});
export type ContributionInput = z.infer<typeof ContributionInputSchema>;

export const RECURRING_FREQUENCIES = ['weekly', 'monthly', 'yearly'] as const;

export const RecurringInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Name the bill').max(40, 'Keep it under 40 characters'),
    type: z.enum(['expense', 'income']),
    amount: minorAmount.positive('Enter an amount'),
    walletId: z.string().min(1, 'Choose a wallet'),
    categoryId: z.string().nullable(),
    frequency: z.enum(RECURRING_FREQUENCIES),
    nextDueAt: z.date(),
  })
  .superRefine((r, ctx) => {
    if (!r.categoryId) {
      ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'Choose a category' });
    }
  });
export type RecurringInput = z.infer<typeof RecurringInputSchema>;

export const DEBT_DIRECTIONS = ['owed_to_me', 'i_owe'] as const;

export const DebtInputSchema = z.object({
  person: z.string().trim().min(1, 'Who is it with?').max(40, 'Keep it under 40 characters'),
  direction: z.enum(DEBT_DIRECTIONS),
  principal: minorAmount.positive('Enter an amount'),
  startedAt: z.date(),
  dueAt: z.date().nullable(),
  note: z.string().trim().max(200, 'Keep the note under 200 characters'),
  /** Wallet the money left or arrived in; null when the loan is not recorded as an entry. */
  walletId: z.string().nullable(),
});
export type DebtInput = z.infer<typeof DebtInputSchema>;

export const SavingsGroupInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Name the group').max(40, 'Keep it under 40 characters'),
    contributionAmount: minorAmount.positive('Enter the contribution'),
    frequency: z.enum(['weekly', 'monthly']),
    /** The other members, by name. */
    members: z.array(z.string().trim().min(1).max(40)).max(100),
    /** The user's place in the payout rotation (1 = first); null if the group doesn't rotate. */
    payoutTurn: z.number().int().positive().nullable(),
    cycleStart: z.date(),
  })
  .superRefine((g, ctx) => {
    if (g.payoutTurn !== null && g.payoutTurn > g.members.length + 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['payoutTurn'],
        message: `With ${g.members.length + 1} members, pick a turn from 1 to ${g.members.length + 1}`,
      });
    }
  });
export type SavingsGroupInput = z.infer<typeof SavingsGroupInputSchema>;
