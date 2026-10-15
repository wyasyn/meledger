import { describe, expect, it } from 'vitest';

import { shouldLock } from './logic';

describe('shouldLock', () => {
  it('locks every time with no delay', () => {
    expect(shouldLock(1000, 1000, 0)).toBe(true);
  });

  it('waits for the delay', () => {
    expect(shouldLock(0, 59_000, 1)).toBe(false);
    expect(shouldLock(0, 60_000, 1)).toBe(true);
  });

  it('never locks without a time in the background', () => {
    expect(shouldLock(null, 999_999, 0)).toBe(false);
  });
});
