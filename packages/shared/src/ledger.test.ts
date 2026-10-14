import { describe, expect, it } from 'vitest';

import {
  computeLedger,
  type LedgerTransaction,
  periodTotals,
  totalBalanceAt,
  walletDeltas,
} from './ledger';

const wallets = [
  { id: 'cash', openingBalance: 50_000 },
  { id: 'momo', openingBalance: 200_000 },
];

let seq = 0;
const tx = (partial: Partial<LedgerTransaction> & Pick<LedgerTransaction, 'type' | 'amount'>) => {
  seq += 1;
  return {
    id: `t${seq}`,
    feeAmount: 0,
    walletId: 'cash',
    toWalletId: null,
    occurredAt: seq * 1000,
    createdAt: seq * 1000,
    ...partial,
  } satisfies LedgerTransaction;
};

describe('walletDeltas', () => {
  it('moves money in and out of one wallet for income and expense', () => {
    expect(walletDeltas(tx({ type: 'income', amount: 100 }))).toEqual([['cash', 100]]);
    expect(walletDeltas(tx({ type: 'expense', amount: 100 }))).toEqual([['cash', -100]]);
  });

  it('charges the transfer fee to the source wallet', () => {
    const t = tx({
      type: 'transfer',
      amount: 100_000,
      feeAmount: 4_400,
      walletId: 'momo',
      toWalletId: 'cash',
    });
    expect(walletDeltas(t)).toEqual([
      ['momo', -104_400],
      ['cash', 100_000],
    ]);
  });
});

describe('computeLedger', () => {
  it('replays transactions in time order and records the balance after each', () => {
    const lunch = tx({ type: 'expense', amount: 12_000, occurredAt: 3_000 });
    const boda = tx({ type: 'expense', amount: 5_000, occurredAt: 1_000 });
    const withdraw = tx({
      type: 'transfer',
      amount: 100_000,
      feeAmount: 4_400,
      walletId: 'momo',
      toWalletId: 'cash',
      occurredAt: 2_000,
    });
    const { balances, balanceAfter } = computeLedger(wallets, [lunch, boda, withdraw]);

    expect(balances.get('cash')).toBe(50_000 - 5_000 + 100_000 - 12_000);
    expect(balances.get('momo')).toBe(200_000 - 104_400);
    expect(balanceAfter.get(boda.id)).toBe(45_000);
    expect(balanceAfter.get(withdraw.id)).toBe(95_600);
    expect(balanceAfter.get(lunch.id)).toBe(133_000);
  });

  it('breaks ties on occurredAt by creation time', () => {
    const a = tx({ type: 'expense', amount: 1_000, occurredAt: 10, createdAt: 2 });
    const b = tx({ type: 'expense', amount: 2_000, occurredAt: 10, createdAt: 1 });
    const { balanceAfter } = computeLedger(wallets, [a, b]);
    expect(balanceAfter.get(b.id)).toBe(48_000);
    expect(balanceAfter.get(a.id)).toBe(47_000);
  });

  it('starts wallets without transactions at their opening balance', () => {
    expect(computeLedger(wallets, []).balances.get('momo')).toBe(200_000);
  });
});

describe('totalBalanceAt', () => {
  it('ignores transactions at or after the cut-off', () => {
    const early = tx({ type: 'income', amount: 10_000, occurredAt: 100 });
    const late = tx({ type: 'expense', amount: 3_000, occurredAt: 200 });
    expect(totalBalanceAt(wallets, [early, late], 200)).toBe(260_000);
    expect(totalBalanceAt(wallets, [early, late], 201)).toBe(257_000);
  });

  it('only counts the fee when moving money between own wallets', () => {
    const t = tx({
      type: 'transfer',
      amount: 50_000,
      feeAmount: 1_000,
      walletId: 'momo',
      toWalletId: 'cash',
      occurredAt: 1,
    });
    expect(totalBalanceAt(wallets, [t], 2)).toBe(249_000);
  });
});

describe('periodTotals', () => {
  it('sums income and expenses inside the half-open range, counting transfer fees as spending', () => {
    const list = [
      tx({ type: 'income', amount: 900_000, occurredAt: 10 }),
      tx({ type: 'expense', amount: 12_000, occurredAt: 20 }),
      tx({
        type: 'transfer',
        amount: 100_000,
        feeAmount: 4_400,
        walletId: 'momo',
        toWalletId: 'cash',
        occurredAt: 30,
      }),
      tx({ type: 'expense', amount: 7_000, occurredAt: 40 }),
    ];
    expect(periodTotals(list, 10, 40)).toEqual({ income: 900_000, expense: 16_400 });
  });
});
