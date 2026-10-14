/**
 * Local SQLite schema (build prompt section 7). Mirrors the Supabase tables so rows can sync.
 * Money is integer minor units; times are epoch milliseconds.
 * This file is loaded by drizzle-kit under Node, so it may only import drizzle-orm.
 */
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const timestamp = (name: string) => integer(name, { mode: 'timestamp_ms' });

/** Columns every table carries: uuid id, owner (null until sign-in), timestamps, soft delete. */
const base = {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  deletedAt: timestamp('deleted_at'),
  syncVersion: integer('sync_version').notNull().default(0),
};

export const profile = sqliteTable('profile', {
  ...base,
  name: text('name'),
  baseCurrency: text('base_currency').notNull().default('UGX'),
  language: text('language').notNull().default('en'),
  monthStartDay: integer('month_start_day').notNull().default(1),
  onboardingDone: integer('onboarding_done', { mode: 'boolean' }).notNull().default(false),
  advisorTone: text('advisor_tone', { enum: ['gentle', 'direct'] })
    .notNull()
    .default('gentle'),
  reminderTime: text('reminder_time').notNull().default('20:00'),
  /** Daily reminder notification on or off (permission asked in onboarding). */
  reminderOn: integer('reminder_on', { mode: 'boolean' }).notNull().default(false),
  /** Ask for fingerprint/face to open the app (lock screen arrives in milestone 5). */
  biometricLock: integer('biometric_lock', { mode: 'boolean' }).notNull().default(false),
  /** Onboarding "How you earn". */
  incomeKind: text('income_kind', { enum: ['salary', 'freelance', 'business', 'irregular'] }),
  usualIncome: integer('usual_income'),
  payDay: integer('pay_day'),
});

export const wallets = sqliteTable('wallets', {
  ...base,
  name: text('name').notNull(),
  type: text('type', { enum: ['cash', 'mobile_money', 'bank', 'card', 'savings'] }).notNull(),
  provider: text('provider'),
  currency: text('currency').notNull().default('UGX'),
  openingBalance: integer('opening_balance').notNull().default(0),
  color: text('color').notNull(),
  icon: text('icon').notNull(),
  /** Lowest sort is the main wallet. */
  sort: integer('sort').notNull().default(0),
  archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
});

export const categories = sqliteTable('categories', {
  ...base,
  name: text('name').notNull(),
  kind: text('kind', { enum: ['income', 'expense'] }).notNull(),
  group: text('group').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  parentId: text('parent_id'),
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
  hidden: integer('hidden', { mode: 'boolean' }).notNull().default(false),
  sort: integer('sort').notNull().default(0),
});

export const transactions = sqliteTable(
  'transactions',
  {
    ...base,
    type: text('type', { enum: ['expense', 'income', 'transfer'] }).notNull(),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull().default('UGX'),
    fxRate: real('fx_rate'),
    walletId: text('wallet_id').notNull(),
    toWalletId: text('to_wallet_id'),
    categoryId: text('category_id'),
    occurredAt: timestamp('occurred_at').notNull(),
    note: text('note'),
    feeAmount: integer('fee_amount').notNull().default(0),
    scope: text('scope', { enum: ['personal', 'business'] })
      .notNull()
      .default('personal'),
    source: text('source', { enum: ['voice', 'keyboard', 'shared_sms', 'receipt'] })
      .notNull()
      .default('keyboard'),
    transcript: text('transcript'),
    confidence: real('confidence'),
    debtId: text('debt_id'),
  },
  (t) => [
    index('transactions_occurred_at_idx').on(t.occurredAt),
    index('transactions_wallet_idx').on(t.walletId),
    index('transactions_category_idx').on(t.categoryId),
  ],
);

export const tags = sqliteTable('tags', {
  ...base,
  name: text('name').notNull(),
  color: text('color').notNull(),
});

export const transactionTags = sqliteTable(
  'transaction_tags',
  {
    ...base,
    transactionId: text('transaction_id').notNull(),
    tagId: text('tag_id').notNull(),
  },
  (t) => [index('transaction_tags_transaction_idx').on(t.transactionId)],
);

export const people = sqliteTable('people', {
  ...base,
  name: text('name').notNull(),
});

export const budgets = sqliteTable('budgets', {
  ...base,
  categoryId: text('category_id').notNull(),
  period: text('period', { enum: ['monthly'] })
    .notNull()
    .default('monthly'),
  limitAmount: integer('limit_amount').notNull(),
  alertAt: integer('alert_at').notNull().default(80),
});

export const goals = sqliteTable('goals', {
  ...base,
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  targetAmount: integer('target_amount').notNull(),
  targetDate: timestamp('target_date'),
  walletId: text('wallet_id'),
  /** Values are defined with goals in milestone 4. */
  status: text('status').notNull(),
});

export const goalContributions = sqliteTable('goal_contributions', {
  ...base,
  goalId: text('goal_id').notNull(),
  amount: integer('amount').notNull(),
  occurredAt: timestamp('occurred_at').notNull(),
  transactionId: text('transaction_id'),
});

export const recurringRules = sqliteTable('recurring_rules', {
  ...base,
  /** JSON transaction template. */
  template: text('template').notNull(),
  frequency: text('frequency').notNull(),
  nextDueAt: timestamp('next_due_at').notNull(),
  mode: text('mode', { enum: ['auto_log', 'remind'] }).notNull(),
});

export const debts = sqliteTable('debts', {
  ...base,
  personId: text('person_id').notNull(),
  direction: text('direction', { enum: ['owed_to_me', 'i_owe'] }).notNull(),
  principal: integer('principal').notNull(),
  dueAt: timestamp('due_at'),
  /** Values are defined with debts in milestone 4. */
  status: text('status').notNull(),
});

export const reminders = sqliteTable('reminders', {
  ...base,
  text: text('text').notNull(),
  dueAt: timestamp('due_at').notNull(),
  repeat: text('repeat'),
  linkedType: text('linked_type'),
  linkedId: text('linked_id'),
});

export const vocabulary = sqliteTable('vocabulary', {
  ...base,
  phrase: text('phrase').notNull(),
  targetType: text('target_type', { enum: ['category', 'wallet', 'person'] }).notNull(),
  targetId: text('target_id').notNull(),
  hits: integer('hits').notNull().default(0),
});

export type Profile = typeof profile.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Tag = typeof tags.$inferSelect;
