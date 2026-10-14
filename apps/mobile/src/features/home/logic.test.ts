import { describe, expect, it } from 'vitest';

import {
  customPeriod,
  monthPeriod,
  periodChipLabel,
  periodLabel,
  presetOf,
  presetPeriod,
  weekPeriod,
} from './logic';

// Wednesday 14 October 2026, mid-afternoon local time.
const now = new Date(2026, 9, 14, 15, 30);

describe('period ranges', () => {
  it('covers the whole month with an exclusive end', () => {
    const p = monthPeriod(now);
    expect(p.from).toEqual(new Date(2026, 9, 1));
    expect(p.to).toEqual(new Date(2026, 10, 1));
  });

  it('starts weeks on Monday', () => {
    const p = weekPeriod(now);
    expect(p.from).toEqual(new Date(2026, 9, 12));
    expect(p.to).toEqual(new Date(2026, 9, 19));
  });

  it('includes both custom days and accepts them in either order', () => {
    const p = customPeriod(new Date(2026, 9, 10, 18), new Date(2026, 9, 3, 9));
    expect(p.from).toEqual(new Date(2026, 9, 3));
    expect(p.to).toEqual(new Date(2026, 9, 11));
  });

  it('builds last month across a year boundary', () => {
    const p = presetPeriod('last_month', new Date(2027, 0, 5));
    expect(p.from).toEqual(new Date(2026, 11, 1));
    expect(p.to).toEqual(new Date(2027, 0, 1));
  });
});

describe('presetOf', () => {
  it('recognises each preset', () => {
    expect(presetOf(presetPeriod('this_month', now), now)).toBe('this_month');
    expect(presetOf(presetPeriod('last_month', now), now)).toBe('last_month');
    expect(presetOf(presetPeriod('this_week', now), now)).toBe('this_week');
  });

  it('does not treat a custom range with the same days as a week', () => {
    const p = customPeriod(new Date(2026, 9, 12), new Date(2026, 9, 18));
    expect(presetOf(p, now)).toBeNull();
  });
});

describe('labels', () => {
  it('formats months, single days and ranges', () => {
    expect(periodLabel(monthPeriod(now))).toBe('October 2026');
    expect(periodLabel(customPeriod(now, now))).toBe('14 Oct 2026');
    expect(periodLabel(weekPeriod(now))).toBe('12 to 18 Oct 2026');
    expect(periodLabel(customPeriod(new Date(2026, 8, 28), new Date(2026, 9, 4)))).toBe(
      '28 Sep to 4 Oct 2026',
    );
    expect(periodLabel(customPeriod(new Date(2026, 11, 28), new Date(2027, 0, 3)))).toBe(
      '28 Dec 2026 to 3 Jan 2027',
    );
  });

  it('names the chip after the preset, or the kind otherwise', () => {
    expect(periodChipLabel(monthPeriod(now), now)).toBe('This month');
    expect(periodChipLabel(monthPeriod(new Date(2026, 5, 1)), now)).toBe('Month');
    expect(periodChipLabel(customPeriod(now, now), now)).toBe('Custom range');
  });
});
