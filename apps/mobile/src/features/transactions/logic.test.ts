import type { LedgerTransaction } from '@meledger/shared';
import { describe, expect, it } from 'vitest';

import { groupByDay, netEffect, parseAmountInput } from './logic';

const at = (iso: string) => new Date(iso).getTime();

const tx = (id: string, iso: string, partial: Partial<LedgerTransaction>): LedgerTransaction => ({
  id,
  type: 'expense',
  amount: 0,
  feeAmount: 0,
  walletId: 'cash',
  toWalletId: null,
  occurredAt: at(iso),
  createdAt: at(iso),
  ...partial,
});

describe('netEffect', () => {
  it('counts only the fee for transfers', () => {
    expect(
      netEffect(
        tx('a', '2026-10-12T10:00:00', {
          type: 'transfer',
          amount: 100_000,
          feeAmount: 4_400,
          toWalletId: 'momo',
        }),
      ),
    ).toBe(-4_400);
  });
});

describe('groupByDay', () => {
  it('groups newest-first entries by local day with a net total', () => {
    const sections = groupByDay([
      tx('c', '2026-10-12T19:00:00', { type: 'income', amount: 50_000 }),
      tx('b', '2026-10-12T08:00:00', { amount: 12_000 }),
      tx('a', '2026-10-11T09:00:00', { amount: 5_000 }),
    ]);
    expect(sections.map((s) => [s.title, s.total, s.data.length])).toEqual([
      ['Monday, 12 October 2026', 38_000, 2],
      ['Sunday, 11 October 2026', -5_000, 1],
    ]);
  });
});

describe('parseAmountInput', () => {
  it('keeps digits only', () => {
    expect(parseAmountInput('12,000')).toBe(12_000);
    expect(parseAmountInput('UGX 5 000')).toBe(5_000);
    expect(parseAmountInput('')).toBe(0);
  });

  it('caps the length to avoid unsafe integers', () => {
    expect(parseAmountInput('9'.repeat(20))).toBe(999_999_999_999);
  });
});
