import { describe, expect, it } from 'vitest';

import { CATEGORY_SEEDS } from './categories';
import { LEGACY_ICON_KEYS, STORED_ICON_KEYS } from './icons';

const keys = new Set<string>(STORED_ICON_KEYS);

describe('icon keys', () => {
  it('are unique', () => {
    expect(keys.size).toBe(STORED_ICON_KEYS.length);
  });

  it('cover every seeded category', () => {
    for (const seed of CATEGORY_SEEDS) expect(keys.has(seed.icon)).toBe(true);
  });

  it('map every legacy name to a known key', () => {
    for (const key of Object.values(LEGACY_ICON_KEYS)) expect(keys.has(key)).toBe(true);
  });
});
