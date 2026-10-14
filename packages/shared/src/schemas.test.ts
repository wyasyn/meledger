import { describe, expect, it } from 'vitest';

import { TransactionInputSchema, WalletInputSchema } from './schemas';

const base = {
  type: 'expense' as const,
  amount: 12_000,
  walletId: 'cash',
  toWalletId: null,
  categoryId: 'food',
  occurredAt: new Date('2026-10-12T12:00:00Z'),
  note: '',
  feeAmount: 0,
  tagIds: [],
};

describe('TransactionInputSchema', () => {
  it('accepts a plain expense', () => {
    expect(TransactionInputSchema.safeParse(base).success).toBe(true);
  });

  it('rejects zero, negative and fractional amounts', () => {
    for (const amount of [0, -5, 1.5]) {
      expect(TransactionInputSchema.safeParse({ ...base, amount }).success).toBe(false);
    }
  });

  it('requires a category for income and expense', () => {
    const result = TransactionInputSchema.safeParse({ ...base, categoryId: null });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['categoryId']);
  });

  it('requires a different destination wallet for transfers', () => {
    const transfer = { ...base, type: 'transfer' as const, categoryId: null };
    expect(TransactionInputSchema.safeParse(transfer).success).toBe(false);
    expect(TransactionInputSchema.safeParse({ ...transfer, toWalletId: 'cash' }).success).toBe(
      false,
    );
    expect(TransactionInputSchema.safeParse({ ...transfer, toWalletId: 'momo' }).success).toBe(
      true,
    );
  });
});

describe('WalletInputSchema', () => {
  it('trims and requires a name', () => {
    const wallet = {
      name: '  MTN MoMo ',
      type: 'mobile_money' as const,
      provider: 'MTN',
      currency: 'UGX' as const,
      openingBalance: 0,
      color: 'amber' as const,
    };
    expect(WalletInputSchema.parse(wallet).name).toBe('MTN MoMo');
    expect(WalletInputSchema.safeParse({ ...wallet, name: '  ' }).success).toBe(false);
  });
});
