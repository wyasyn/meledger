import { describe, expect, it } from 'vitest';

import { buildCsv, csvField } from './csv';

describe('csvField', () => {
  it('quotes only when needed', () => {
    expect(csvField('lunch')).toBe('lunch');
    expect(csvField('rolex, juice')).toBe('"rolex, juice"');
    expect(csvField('the "big" one')).toBe('"the ""big"" one"');
  });
});

describe('buildCsv', () => {
  it('writes names, whole amounts and tags', () => {
    const csv = buildCsv(
      [
        {
          id: 't1',
          occurredAt: new Date('2026-10-15T13:05'),
          type: 'expense',
          amount: 12_000,
          currency: 'UGX',
          feeAmount: 0,
          walletId: 'cash',
          toWalletId: null,
          categoryId: 'eat',
          note: 'Rolex, juice',
          source: 'voice',
        },
        {
          id: 't2',
          occurredAt: new Date('2026-10-14T09:00'),
          type: 'transfer',
          amount: 1250,
          currency: 'USD',
          feeAmount: 50,
          walletId: 'cash',
          toWalletId: 'bank',
          categoryId: null,
          note: null,
          source: 'keyboard',
        },
      ],
      {
        wallets: new Map([
          ['cash', 'Cash'],
          ['bank', 'Bank'],
        ]),
        categories: new Map([['eat', 'Eating out']]),
        tags: (id) => (id === 't1' ? ['Work', 'Lunch'] : []),
      },
    );
    expect(csv.split('\r\n')).toEqual([
      'Date,Type,Amount,Currency,Fee,Wallet,To wallet,Category,Note,Tags,Added by',
      '2026-10-15 13:05,Expense,12000,UGX,,Cash,,Eating out,"Rolex, juice",Work; Lunch,Voice',
      '2026-10-14 09:00,Transfer,12.5,USD,0.5,Cash,Bank,,,,Keyboard',
      '',
    ]);
  });
});
