import { describe, expect, it } from 'vitest';

import { CATEGORY_SEEDS } from './categories';

describe('CATEGORY_SEEDS', () => {
  it('has unique ids and names per kind', () => {
    expect(new Set(CATEGORY_SEEDS.map((c) => c.id)).size).toBe(CATEGORY_SEEDS.length);
    const keys = CATEGORY_SEEDS.map((c) => `${c.kind}:${c.name}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('covers both kinds', () => {
    expect(CATEGORY_SEEDS.some((c) => c.kind === 'income')).toBe(true);
    expect(CATEGORY_SEEDS.some((c) => c.kind === 'expense')).toBe(true);
  });
});
