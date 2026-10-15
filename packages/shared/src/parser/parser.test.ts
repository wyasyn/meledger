import { describe, expect, it } from 'vitest';

import { CATEGORY_SEEDS } from '../categories';
import { localParse, ParseResultSchema, type ParseContext, type ParsedItem } from './index';

const ctx: ParseContext = {
  today: '2026-10-14', // a Wednesday
  wallets: [
    { id: 'cash', name: 'Cash', type: 'cash', provider: null },
    { id: 'mtn', name: 'MTN MoMo', type: 'mobile_money', provider: 'MTN' },
    { id: 'airtel', name: 'Airtel Money', type: 'mobile_money', provider: 'Airtel' },
    { id: 'bank', name: 'Bank', type: 'bank', provider: null },
  ],
  categories: CATEGORY_SEEDS.map(({ id, name, kind }) => ({ id, name, kind })),
  vocabulary: [],
};

function cat(name: string): string {
  const found = CATEGORY_SEEDS.find((c) => c.name === name);
  if (!found) throw new Error(`No seed category ${name}`);
  return found.id;
}

type Expected = Partial<Omit<ParsedItem, 'confidence' | 'uncertain'>>;

function items(text: string, c: ParseContext = ctx): ParsedItem[] {
  const result = localParse(text, c);
  expect(ParseResultSchema.safeParse(result).success).toBe(true);
  expect(result.intent).toBe('log');
  return result.items;
}

/** Utterance fixtures: each line must produce exactly these items (only the listed fields are checked). */
const LOG_FIXTURES: [string, Expected[]][] = [
  // Milestone 3 acceptance line.
  [
    'paid boda 5k and lunch 12k cash',
    [
      {
        type: 'expense',
        amount: 5_000,
        categoryId: cat('Boda/Taxi'),
        walletId: 'cash',
        note: 'Boda',
      },
      {
        type: 'expense',
        amount: 12_000,
        categoryId: cat('Eating out'),
        walletId: 'cash',
        note: 'Lunch',
      },
    ],
  ],
  // Amount shapes
  ['boda 5K', [{ amount: 5_000 }]],
  ['lunch 5,000', [{ amount: 5_000, categoryId: cat('Eating out') }]],
  ['lunch 5000', [{ amount: 5_000 }]],
  ['fuel 1.2m', [{ amount: 1_200_000, categoryId: cat('Fuel') }]],
  ['rent 1.5 million', [{ amount: 1_500_000, categoryId: cat('Rent/Mortgage') }]],
  // Land and property
  [
    'i bought land at 1M yesterday',
    [
      {
        type: 'expense',
        amount: 1_000_000,
        categoryId: cat('Land & property'),
        date: '2026-10-13',
        note: 'Land',
      },
    ],
  ],
  ['bought a plot in Mukono 25m', [{ amount: 25_000_000, categoryId: cat('Land & property') }]],
  ['paid for the kibanja 3m', [{ amount: 3_000_000, categoryId: cat('Land & property') }]],
  ['land title 800k', [{ amount: 800_000, categoryId: cat('Land & property') }]],
  ['paid the landlord 400k', [{ amount: 400_000, categoryId: cat('Rent/Mortgage') }]],
  ['matooke fifty thousand', [{ amount: 50_000, categoryId: cat('Groceries') }]],
  ['school fees two hundred k', [{ amount: 200_000, categoryId: cat('School fees') }]],
  ['airtime shs 3000', [{ amount: 3_000, categoryId: cat('Airtime & Data') }]],
  ['yaka UGX 3,000', [{ amount: 3_000, categoryId: cat('Electricity (Yaka)') }]],
  ['netflix $20', [{ amount: 2_000, currency: 'USD', categoryId: cat('Movies') }]],
  [
    'paid 15 dollars for a course',
    [{ amount: 1_500, currency: 'USD', categoryId: cat('Courses') }],
  ],
  ['rent two hundred and fifty thousand', [{ amount: 250_000 }]],
  [
    'twenty five thousand five hundred for groceries',
    [{ amount: 25_500, categoryId: cat('Groceries') }],
  ],
  ['a hundred thousand for sacco', [{ amount: 100_000, categoryId: cat('Savings group/SACCO') }]],
  ['laptop 2 million', [{ amount: 2_000_000, categoryId: cat('Electronics') }]],
  ['5 k for tea', [{ amount: 5_000, categoryId: cat('Coffee & snacks') }]],
  ['bought 3 sodas 6000', [{ amount: 6_000, categoryId: cat('Coffee & snacks') }]],
  ['ugx3000 chapati', [{ amount: 3_000, categoryId: cat('Eating out') }]],
  // Splitting
  [
    'rolex 3k, soda 2k, airtime 5k',
    [
      { amount: 3_000, categoryId: cat('Eating out') },
      { amount: 2_000, categoryId: cat('Coffee & snacks') },
      { amount: 5_000, categoryId: cat('Airtime & Data') },
    ],
  ],
  [
    'paid rent 500k then yaka 50k',
    [
      { amount: 500_000, categoryId: cat('Rent/Mortgage') },
      { amount: 50_000, categoryId: cat('Electricity (Yaka)') },
    ],
  ],
  [
    'data 10k plus taxi 4k',
    [
      { amount: 10_000, categoryId: cat('Airtime & Data') },
      { amount: 4_000, categoryId: cat('Boda/Taxi') },
    ],
  ],
  ['bread and milk 8k', [{ amount: 8_000, categoryId: cat('Groceries'), note: 'Bread milk' }]],
  [
    'lunch 12,000, boda 5,000',
    [
      { amount: 12_000, categoryId: cat('Eating out') },
      { amount: 5_000, categoryId: cat('Boda/Taxi') },
    ],
  ],
  [
    'boda 5 thousand and two sodas 2k',
    [
      { amount: 5_000, categoryId: cat('Boda/Taxi') },
      { amount: 2_000, categoryId: cat('Coffee & snacks') },
    ],
  ],
  // Income
  ['got paid salary 2.5m', [{ type: 'income', amount: 2_500_000, categoryId: cat('Salary') }]],
  [
    'received 300k from a client',
    [{ type: 'income', amount: 300_000, categoryId: cat('Freelance/Contract') }],
  ],
  [
    'salary 1.8m on bank',
    [{ type: 'income', amount: 1_800_000, categoryId: cat('Salary'), walletId: 'bank' }],
  ],
  ['sold chapatis 45k', [{ type: 'income', amount: 45_000, categoryId: cat('Business') }]],
  ['earned 100k', [{ type: 'income', amount: 100_000, categoryId: cat('Other') }]],
  [
    'got a refund of 20k on momo',
    [{ type: 'income', amount: 20_000, categoryId: cat('Refunds'), walletId: 'mtn' }],
  ],
  ['mum sent me 50k', [{ type: 'income', amount: 50_000 }]],
  [
    'interest 12k on bank',
    [{ type: 'income', amount: 12_000, categoryId: cat('Interest/Dividends') }],
  ],
  [
    'received 50k from Musa and 30k from Jane',
    [
      { type: 'income', amount: 50_000 },
      { type: 'income', amount: 30_000 },
    ],
  ],
  [
    'got paid 500k and spent 20k on lunch',
    [
      { type: 'income', amount: 500_000 },
      { type: 'expense', amount: 20_000, categoryId: cat('Eating out') },
    ],
  ],
  // Transfers and fees
  [
    'withdrew 100k from momo fee 2,500',
    [{ type: 'transfer', amount: 100_000, walletId: 'mtn', toWalletId: 'cash', feeAmount: 2_500 }],
  ],
  [
    'withdraw 50k airtel charged 1000',
    [{ type: 'transfer', walletId: 'airtel', toWalletId: 'cash', feeAmount: 1_000 }],
  ],
  [
    'deposited 200k to bank',
    [{ type: 'transfer', amount: 200_000, walletId: 'cash', toWalletId: 'bank' }],
  ],
  [
    'sent 50k from momo to bank',
    [{ type: 'transfer', amount: 50_000, walletId: 'mtn', toWalletId: 'bank' }],
  ],
  ['moved 30k from bank to airtel', [{ type: 'transfer', walletId: 'bank', toWalletId: 'airtel' }]],
  [
    'transferred 1m from bank to momo, fee 4,400',
    [{ type: 'transfer', amount: 1_000_000, feeAmount: 4_400 }],
  ],
  [
    'paid yaka 50k on momo fee 500',
    [
      { type: 'expense', amount: 50_000, walletId: 'mtn', categoryId: cat('Electricity (Yaka)') },
      {
        type: 'expense',
        amount: 500,
        walletId: 'mtn',
        categoryId: cat('Mobile money fees'),
        note: 'Fee',
      },
    ],
  ],
  // Wallets
  ['fuel 40k mtn momo', [{ walletId: 'mtn' }]],
  ['groceries 60k mobile money', [{ walletId: 'mtn' }]],
  ['supper 15k airtel', [{ walletId: 'airtel' }]],
  ['shoes 80k on card', [{ walletId: 'cash' }]], // no card wallet: falls back to the main wallet
  ['books 25k from bank', [{ walletId: 'bank', categoryId: cat('Books') }]],
  ['boda 3k', [{ walletId: 'cash' }]],
  // Dates
  ['boda 5k yesterday', [{ date: '2026-10-13' }]],
  ['lunch 10k last friday', [{ date: '2026-10-09' }]],
  ['paid rent on the 3rd 400k', [{ date: '2026-10-03', amount: 400_000 }]],
  ['water bill 30k on the 20th', [{ date: '2026-09-20', categoryId: cat('Water') }]],
  ['salon 25k on monday', [{ date: '2026-10-12', categoryId: cat('Beauty') }]],
  ['hospital 70k 2 days ago', [{ date: '2026-10-12', amount: 70_000, categoryId: cat('Doctor') }]],
  ['drinks 40k last night', [{ date: '2026-10-13', categoryId: cat('Parties') }]],
  ['fuel 100k on 3 october', [{ date: '2026-10-03', amount: 100_000 }]],
  ['the day before yesterday boda 4k', [{ date: '2026-10-12', amount: 4_000 }]],
  ['airtime 2k and data 5k yesterday', [{ date: '2026-10-13' }, { date: '2026-10-13' }]],
  // Ugandan and Luganda words
  ['nsasudde boda 3k', [{ type: 'expense', amount: 3_000, categoryId: cat('Boda/Taxi') }]],
  ['nguze emmere 20k', [{ type: 'expense', categoryId: cat('Groceries') }]],
  ['nfunye omusaala 1m', [{ type: 'income', amount: 1_000_000, categoryId: cat('Salary') }]],
  ['kwanjula contribution 100k', [{ categoryId: cat('Contributions (weddings, burials)') }]],
  ['burial 50k', [{ categoryId: cat('Contributions (weddings, burials)') }]],
  ['sacco 200k', [{ categoryId: cat('Savings group/SACCO') }]],
  ['vsla 20k', [{ categoryId: cat('Savings group/SACCO') }]],
  ['umeme 75k', [{ categoryId: cat('Electricity (Yaka)') }]],
  ['nwsc 45k', [{ categoryId: cat('Water') }]],
  ['safeboda 7k', [{ categoryId: cat('Boda/Taxi') }]],
  ['tithe 20k', [{ categoryId: cat('Church/Mosque giving') }]],
  ['sent mum 100k', [{ type: 'expense', categoryId: cat('Family support') }]],
  ['pharmacy 15k for panadol', [{ categoryId: cat('Medication') }]],
  ['gave sadaka 10k at the mosque', [{ categoryId: cat('Church/Mosque giving') }]],
  ['bundles 10k', [{ categoryId: cat('Airtime & Data') }]],
  ['kasooli 30k ku cash', [{ categoryId: cat('Groceries'), walletId: 'cash' }]],
  // Debts
  ['lent Musa 100k', [{ debt: 'lend', person: 'Musa', type: 'expense', amount: 100_000 }]],
  [
    'borrowed 50k from Sarah',
    [{ debt: 'borrow', person: 'Sarah', type: 'income', amount: 50_000 }],
  ],
  [
    'Musa paid me back 50k',
    [{ debt: 'repaid_to_me', person: 'Musa', type: 'income', amount: 50_000 }],
  ],
  ['paid back John 20k', [{ debt: 'repay', person: 'John', type: 'expense', amount: 20_000 }]],
];

describe('localParse: logging', () => {
  it.each(LOG_FIXTURES)('%s', (text, expected) => {
    const parsed = items(text);
    expect(parsed).toHaveLength(expected.length);
    expected.forEach((e, i) => expect(parsed[i]).toMatchObject(e));
  });

  it('has at least 60 utterance fixtures', () => {
    expect(LOG_FIXTURES.length).toBeGreaterThanOrEqual(60);
  });

  it('is confident about clear lines', () => {
    const result = localParse('paid boda 5k and lunch 12k cash', ctx);
    expect(result.confident).toBe(true);
    expect(result.items.every((i) => i.uncertain.length === 0)).toBe(true);
  });

  it('marks a quantity without a real amount as uncertain', () => {
    const result = localParse('2 sodas', ctx);
    expect(result.intent).toBe('unknown');
    const weak = localParse('bought 2 sodas', ctx);
    expect(weak.items[0]?.uncertain).toContain('amount');
    expect(weak.confident).toBe(false);
  });

  it('marks an unknown category and an unclear type as uncertain', () => {
    const [item] = items('zzz 10k');
    expect(item?.categoryId).toBeNull();
    expect(item?.uncertain).toEqual(expect.arrayContaining(['category', 'type']));
  });

  it('defaults the date to today and the wallet to the main wallet', () => {
    const [item] = items('lunch 10k', { ...ctx, defaultWalletId: 'mtn' });
    expect(item).toMatchObject({ date: '2026-10-14', walletId: 'mtn' });
  });

  it('lets the user vocabulary override the seed map', () => {
    const vocab: ParseContext = {
      ...ctx,
      vocabulary: [
        { phrase: 'rolex', targetType: 'category', targetId: cat('Groceries') },
        { phrase: 'stash', targetType: 'wallet', targetId: 'bank' },
      ],
    };
    const [item] = items('rolex 3k from stash', vocab);
    expect(item).toMatchObject({ categoryId: cat('Groceries'), walletId: 'bank', phrase: 'rolex' });
    expect(item?.confidence.category).toBe(1);
  });

  it('matches a category the user created', () => {
    const custom: ParseContext = {
      ...ctx,
      categories: [...ctx.categories, { id: 'pets', name: 'Dog food', kind: 'expense' }],
    };
    expect(items('dog food 40k', custom)[0]?.categoryId).toBe('pets');
  });

  it('keeps the phrase that chose the category for learning', () => {
    expect(items('paid boda 5k')[0]?.phrase).toBe('boda');
    expect(items('zzz thing 5k')[0]?.phrase).toBe('zzz thing');
  });
});

describe('localParse: questions', () => {
  it.each([
    [
      'how much did I spend on boda this week?',
      { metric: 'spent', categoryId: cat('Boda/Taxi'), period: 'this_week' },
    ],
    [
      'how much have I spent this month',
      { metric: 'spent', categoryId: null, period: 'this_month' },
    ],
    ['what did I spend most on last month', { metric: 'top_categories', period: 'last_month' }],
    ['where did my money go this week', { metric: 'top_categories', period: 'this_week' }],
    ['how much did I earn this year', { metric: 'earned', period: 'this_year' }],
    ["what's my balance", { metric: 'balance' }],
    ['how much is on momo', { metric: 'balance', walletId: 'mtn' }],
    ['how much did I spend yesterday', { metric: 'spent', period: 'yesterday' }],
    [
      'how much is left in my food budget?',
      { metric: 'budget_left', categoryId: cat('Groceries'), goal: null },
    ],
    ['how are my budgets', { metric: 'budget_left', categoryId: null }],
    ["how's my goal?", { metric: 'goal_progress', goal: null }],
    ['how much have I saved for my laptop goal', { metric: 'goal_progress', goal: 'laptop' }],
    ['am I on track with the school fees goal', { metric: 'goal_progress', goal: 'school' }],
  ] as const)('%s', (text, expected) => {
    const result = localParse(text, ctx);
    expect(result.intent).toBe('question');
    expect(result.question).toMatchObject(expected);
    expect(ParseResultSchema.safeParse(result).success).toBe(true);
  });

  it('leaves questions it cannot answer locally without a shape', () => {
    const result = localParse('can I afford a new phone?', ctx);
    expect(result).toMatchObject({ intent: 'question', question: null, confident: false });
  });
});

describe('localParse: commands', () => {
  it('reads a budget', () => {
    const result = localParse('set food budget to 600k', ctx);
    expect(result).toMatchObject({
      intent: 'set_budget',
      command: { amount: 600_000, categoryId: cat('Groceries') },
    });
  });

  it('reads a reminder with a future date', () => {
    const result = localParse('remind me to pay rent on the 28th', ctx);
    expect(result.intent).toBe('add_reminder');
    expect(result.command).toMatchObject({ date: '2026-10-28', text: 'Pay rent' });
  });

  it('reads a reminder date in next month', () => {
    expect(localParse('remind me to pay school fees on the 2nd', ctx).command?.date).toBe(
      '2026-11-02',
    );
  });

  it('reads a new goal', () => {
    const result = localParse('new goal laptop 3 million', ctx);
    expect(result).toMatchObject({
      intent: 'set_goal',
      command: { amount: 3_000_000, text: 'Laptop' },
    });
  });

  it('reads a goal contribution', () => {
    const result = localParse('add 50k to my emergency fund goal', ctx);
    expect(result).toMatchObject({ intent: 'contribute_goal', command: { amount: 50_000 } });
  });

  it('returns unknown for lines with nothing to log', () => {
    expect(localParse('hello there', ctx).intent).toBe('unknown');
    expect(localParse('', ctx).intent).toBe('unknown');
  });
});
