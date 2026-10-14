import { describe, expect, it } from 'vitest';

import { formatAmount, formatMoney, fromMinor, toMinor } from './money';

describe('formatMoney', () => {
  it('formats UGX with thousands separators and no decimals', () => {
    expect(formatMoney(87457, 'UGX')).toBe('UGX 87,457');
    expect(formatMoney(1421000, 'UGX')).toBe('UGX 1,421,000');
    expect(formatMoney(0, 'UGX')).toBe('UGX 0');
    expect(formatMoney(999, 'UGX')).toBe('UGX 999');
  });

  it('defaults to UGX', () => {
    expect(formatMoney(5000)).toBe('UGX 5,000');
  });

  it('puts the sign before the currency code', () => {
    expect(formatMoney(-12000, 'UGX')).toBe('-UGX 12,000');
  });

  it('formats USD with two decimals', () => {
    expect(formatMoney(1250, 'USD')).toBe('USD 12.50');
    expect(formatMoney(123456789, 'USD')).toBe('USD 1,234,567.89');
    expect(formatMoney(5, 'USD')).toBe('USD 0.05');
    expect(formatMoney(-5, 'USD')).toBe('-USD 0.05');
  });

  it('rejects non-integer minor units', () => {
    expect(() => formatAmount(1.5, 'UGX')).toThrow(RangeError);
  });
});

describe('toMinor / fromMinor', () => {
  it('round-trips UGX and USD', () => {
    expect(toMinor(87457, 'UGX')).toBe(87457);
    expect(toMinor(12.5, 'USD')).toBe(1250);
    expect(toMinor(0.1 + 0.2, 'USD')).toBe(30);
    expect(fromMinor(1250, 'USD')).toBe(12.5);
    expect(fromMinor(5000, 'UGX')).toBe(5000);
  });
});
