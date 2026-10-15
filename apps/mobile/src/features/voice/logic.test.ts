import { CATEGORY_SEEDS, DEBT_CATEGORY_IDS, localParse } from '@meledger/shared';
import { describe, expect, it } from 'vitest';

import { answerQuestion, buildParseContext, learningsFor, matchGoal, toDraft } from './logic';

const now = new Date(2026, 9, 14, 18, 30); // Wednesday 14 October 2026, 18:30 local
const wallets = [
  { id: 'cash', name: 'Cash', type: 'cash' as const, provider: null, archived: false },
  { id: 'old', name: 'Old bank', type: 'bank' as const, provider: null, archived: true },
  { id: 'mtn', name: 'MTN MoMo', type: 'mobile_money' as const, provider: 'MTN', archived: false },
];
const categories = CATEGORY_SEEDS.map(({ id, name, kind }) => ({ id, name, kind }));
const cat = (name: string) => CATEGORY_SEEDS.find((c) => c.name === name)!.id;
const ctx = buildParseContext(wallets, categories, [], now);

describe('buildParseContext', () => {
  it('leaves out archived wallets and uses the first active one as default', () => {
    expect(ctx.wallets.map((w) => w.id)).toEqual(['cash', 'mtn']);
    expect(ctx.defaultWalletId).toBe('cash');
    expect(ctx.today).toBe('2026-10-14');
  });
});

describe('toDraft', () => {
  it('turns the acceptance line into two saveable entries', () => {
    const result = localParse('paid boda 5k and lunch 12k cash', ctx);
    const drafts = result.items.map((item, i) => toDraft(item, String(i), 'cash', now));
    expect(drafts.map((d) => d.input)).toMatchObject([
      {
        type: 'expense',
        amount: 5_000,
        walletId: 'cash',
        categoryId: cat('Boda/Taxi'),
        note: 'Boda',
      },
      {
        type: 'expense',
        amount: 12_000,
        walletId: 'cash',
        categoryId: cat('Eating out'),
        note: 'Lunch',
      },
    ]);
    expect(drafts.every((d) => d.savable)).toBe(true);
  });

  it('keeps the time of day but moves to the heard day', () => {
    const [item] = localParse('lunch 10k yesterday', ctx).items;
    const draft = toDraft(item!, 'a', 'cash', now);
    expect(draft.input.occurredAt).toEqual(new Date(2026, 9, 13, 18, 30));
  });

  it('asks for a UGX amount when a dollar amount was heard', () => {
    const [item] = localParse('netflix $20', ctx).items;
    const draft = toDraft(item!, 'a', 'cash', now);
    expect(draft).toMatchObject({ heardUsd: 20, input: { amount: 0 } });
  });

  it('turns a loan into a debt card with the debt category', () => {
    const [item] = localParse('lent Musa 100k', ctx).items;
    const draft = toDraft(item!, 'a', 'cash', now);
    expect(draft.savable).toBe(true);
    expect(draft.debt).toEqual({ kind: 'lend', person: 'Musa' });
    expect(draft.input).toMatchObject({
      type: 'expense',
      amount: 100_000,
      categoryId: DEBT_CATEGORY_IDS.lent,
    });
  });

  it('turns "paid me back" into a repayment into a wallet', () => {
    const [item] = localParse('Musa paid me back 50k', ctx).items;
    const draft = toDraft(item!, 'a', 'cash', now);
    expect(draft.debt).toEqual({ kind: 'repaid_to_me', person: 'Musa' });
    expect(draft.input).toMatchObject({ type: 'income', categoryId: DEBT_CATEGORY_IDS.repaidToMe });
  });
});

describe('learningsFor', () => {
  const draftFor = (text: string) => toDraft(localParse(text, ctx).items[0]!, 'a', 'cash', now);

  it('learns the heard words when the category is changed', () => {
    const draft = draftFor('rolex 3k');
    draft.input.categoryId = cat('Groceries');
    expect(learningsFor(draft)).toEqual([
      { phrase: 'rolex', targetType: 'category', targetId: cat('Groceries') },
    ]);
  });

  it('learns words the parser did not know', () => {
    const draft = draftFor('zzz thing 3k');
    draft.input.categoryId = cat('Hobbies');
    expect(learningsFor(draft)[0]?.phrase).toBe('zzz thing');
  });

  it('learns nothing when the category was kept', () => {
    expect(learningsFor(draftFor('boda 3k'))).toEqual([]);
  });
});

describe('answerQuestion', () => {
  const at = (d: number) => new Date(2026, 9, d, 12).getTime();
  const tx = (
    id: string,
    day: number,
    amount: number,
    categoryId: string,
    type: 'expense' | 'income' = 'expense',
  ) => ({
    id,
    type,
    amount,
    feeAmount: 0,
    walletId: 'cash',
    toWalletId: null,
    occurredAt: at(day),
    createdAt: at(day),
    categoryId,
  });
  const data = {
    transactions: [
      tx('1', 13, 5_000, cat('Boda/Taxi')),
      tx('2', 14, 7_000, cat('Boda/Taxi')),
      tx('3', 2, 40_000, cat('Groceries')),
      tx('4', 14, 13_000, cat('Eating out')),
      tx('5', 1, 2_000_000, cat('Salary'), 'income'),
    ],
    categories,
    wallets: [
      { id: 'cash', name: 'Cash' },
      { id: 'mtn', name: 'MTN MoMo' },
    ],
    balances: new Map([
      ['cash', 150_000],
      ['mtn', 50_000],
    ]),
    budgets: [
      {
        categoryId: cat('Groceries'),
        period: 'monthly' as const,
        limitAmount: 100_000,
        alertAt: 80,
        startsAt: null,
        endsAt: null,
      },
      {
        categoryId: cat('Eating out'),
        period: 'weekly' as const,
        limitAmount: 10_000,
        alertAt: 80,
        startsAt: null,
        endsAt: null,
      },
    ],
    goals: [
      {
        id: 'l',
        name: 'Laptop',
        targetAmount: 1_000_000,
        targetDate: new Date(2027, 0, 14, 18, 30),
        createdAt: new Date(2026, 6, 14, 18, 30),
        saved: 200_000,
      },
      {
        id: 's',
        name: 'School fees',
        targetAmount: 500_000,
        targetDate: null,
        createdAt: new Date(2026, 0, 1),
        saved: 500_000,
      },
    ],
  };
  const ask = (text: string, d = data) => answerQuestion(localParse(text, ctx).question!, d, now);

  it('sums spending on a category this week', () => {
    expect(ask('how much did I spend on boda this week?').text).toBe(
      'You spent UGX 12,000 on Boda/Taxi this week.',
    );
  });

  it('sums all spending this month', () => {
    expect(ask('how much have I spent this month').text).toBe('You spent UGX 65,000 this month.');
  });

  it('sums income', () => {
    expect(ask('how much did I earn this month').text).toBe(
      'You received UGX 2,000,000 this month.',
    );
  });

  it('lists the top categories', () => {
    const answer = ask('what did I spend most on this month');
    expect(answer.text).toBe('You spent the most on Groceries this month: UGX 40,000.');
    expect(answer.rows.map((r) => r.label)).toEqual(['Groceries', 'Eating out', 'Boda/Taxi']);
  });

  it('reads a wallet balance and the total', () => {
    expect(ask('how much is on momo').text).toBe('You have UGX 50,000 on MTN MoMo.');
    expect(ask("what's my balance").text).toBe('Your balance is UGX 200,000 across all wallets.');
  });

  it('reads what is left in one budget', () => {
    expect(ask('how much is left in my food budget?').text).toBe(
      'You have UGX 60,000 left of UGX 100,000 in your Groceries budget this month.',
    );
    expect(ask('how is my eating out budget').text).toBe(
      "You're UGX 3,000 over your Eating out budget this week.",
    );
    expect(ask('how much is left in my boda budget').text).toBe(
      "You haven't set a budget for Boda/Taxi yet.",
    );
  });

  it('lists every budget', () => {
    const answer = ask('how are my budgets');
    expect(answer.text).toBe("Here's what's left in your 2 budgets. 1 is over.");
    expect(answer.rows).toEqual([
      { label: 'Groceries', amount: 60_000 },
      { label: 'Eating out (over by)', amount: 3_000 },
    ]);
    expect(ask('how are my budgets', { ...data, budgets: [] }).text).toBe(
      "You haven't set any budgets yet.",
    );
  });

  it('reads one goal by name', () => {
    const answer = ask('how is my laptop goal');
    expect(answer.text).toBe(
      "You've saved UGX 200,000 of UGX 1,000,000 for Laptop (20%). You're 30% behind schedule and off target.",
    );
    expect(answer.rows).toEqual([{ label: 'Left to save', amount: 800_000 }]);
    expect(ask('have I reached my school fees goal').text).toBe(
      "You've reached your School fees goal: UGX 500,000 saved. Well done!",
    );
  });

  it('sums every goal, or reads the only one', () => {
    const answer = ask("how's my goal?");
    expect(answer.text).toBe("You've saved UGX 700,000 across your 2 goals. 1 is behind schedule.");
    expect(answer.rows.map((r) => r.label)).toEqual(['Laptop (20%)', 'School fees (100%)']);
    expect(ask("how's my goal?", { ...data, goals: [data.goals[0]!] }).text).toMatch(
      /^You've saved UGX 200,000 of/,
    );
    expect(ask("how's my goal?", { ...data, goals: [] }).text).toBe(
      "You haven't set any goals yet.",
    );
  });
});

describe('matchGoal', () => {
  const goals = [
    { id: 'l', name: 'Laptop' },
    { id: 's', name: 'School fees' },
  ];

  it('picks the goal named in the command', () => {
    const command = localParse('add 50k to my laptop goal', ctx).command!;
    expect(matchGoal(command.text, goals)?.id).toBe('l');
    expect(matchGoal('school fee', goals)?.id).toBe('s');
  });

  it('falls back to the only goal, or none', () => {
    expect(matchGoal('something', [goals[0]!])?.id).toBe('l');
    expect(matchGoal('something', goals)).toBeNull();
  });
});
