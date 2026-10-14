import { CATEGORY_SEEDS, localParse } from '@meledger/shared';
import { describe, expect, it } from 'vitest';

import { answerQuestion, buildParseContext, learningsFor, toDraft } from './logic';

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

  it('holds loans back until debts exist', () => {
    const [item] = localParse('lent Musa 100k', ctx).items;
    expect(toDraft(item!, 'a', 'cash', now).savable).toBe(false);
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
  };
  const ask = (text: string) => answerQuestion(localParse(text, ctx).question!, data, now);

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
});
