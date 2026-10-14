/** Date helpers on `YYYY-MM-DD` strings. All arithmetic is in UTC so the device time zone never shifts a day. */

const MS_PER_DAY = 86_400_000;

function toUtc(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return toIso(new Date(toUtc(iso).getTime() + days * MS_PER_DAY));
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];
const MONTH_SHORT: Record<string, number> = Object.fromEntries([
  ...MONTHS.map((m, i) => [m, i] as const),
  ...MONTHS.map((m, i) => [m.slice(0, 3), i] as const),
  ['sept', 8],
]);

const SMALL_NUMBERS: Record<string, number> = {
  one: 1,
  a: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
};

/** Clamps a day to the month length, e.g. the 31st in a 30-day month. */
function dateInMonth(year: number, month: number, day: number): Date {
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, last)));
}

/**
 * The given day of the month, nearest to today in the given direction: logging looks back
 * ("on the 3rd" said on the 2nd means last month), reminders look forward.
 */
export function resolveDayOfMonth(
  today: string,
  day: number,
  direction: 'past' | 'future',
  month?: number,
): string {
  const t = toUtc(today);
  const year = t.getUTCFullYear();
  if (month !== undefined) {
    let d = dateInMonth(year, month, day);
    if (direction === 'past' && d > t) d = dateInMonth(year - 1, month, day);
    if (direction === 'future' && d < t) d = dateInMonth(year + 1, month, day);
    return toIso(d);
  }
  let d = dateInMonth(year, t.getUTCMonth(), day);
  if (direction === 'past' && d > t) d = dateInMonth(year, t.getUTCMonth() - 1, day);
  if (direction === 'future' && d < t) d = dateInMonth(year, t.getUTCMonth() + 1, day);
  return toIso(d);
}

export interface DateMatch {
  date: string;
  /** Token indexes the date used, so they are not read as amounts or note words. */
  indexes: number[];
}

const ordinal = (t: string | undefined) => {
  const m = t?.match(/^(\d{1,2})(?:st|nd|rd|th)$/);
  const n = m ? Number(m[1]) : NaN;
  return n >= 1 && n <= 31 ? n : null;
};

const ORDINAL_WORDS: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
  fifth: 5,
  sixth: 6,
  seventh: 7,
  eighth: 8,
  ninth: 9,
  tenth: 10,
};

/**
 * Finds a spoken date in the tokens: today, yesterday, last Friday, on the 3rd, 3rd March,
 * 2 days ago. Returns null when none is said.
 */
export function readDate(
  tokens: readonly string[],
  today: string,
  direction: 'past' | 'future' = 'past',
): DateMatch | null {
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i]!;
    const next = tokens[i + 1];

    if (
      t === 'today' ||
      t === 'tonight' ||
      (t === 'this' && (next === 'morning' || next === 'evening' || next === 'afternoon'))
    ) {
      return { date: today, indexes: t === 'this' ? [i, i + 1] : [i] };
    }
    if (t === 'tomorrow') return { date: addDays(today, 1), indexes: [i] };
    if (t === 'yesterday') {
      return { date: addDays(today, -1), indexes: [i] };
    }
    if (t === 'last' && next === 'night') return { date: addDays(today, -1), indexes: [i, i + 1] };
    if (t === 'day' && next === 'before' && tokens[i + 2] === 'yesterday') {
      const start = tokens[i - 1] === 'the' ? i - 1 : i;
      const indexes = [];
      for (let k = start; k <= i + 2; k += 1) indexes.push(k);
      return { date: addDays(today, -2), indexes };
    }

    // "2 days ago", "two days ago"
    if ((next === 'days' || next === 'day') && tokens[i + 2] === 'ago') {
      const n = /^\d+$/.test(t) ? Number(t) : SMALL_NUMBERS[t];
      if (n !== undefined && n <= 31)
        return { date: addDays(today, -n), indexes: [i, i + 1, i + 2] };
    }

    // "last friday", "on friday", "friday"
    const weekday = WEEKDAYS.indexOf(t);
    if (weekday >= 0) {
      const todayDow = toUtc(today).getUTCDay();
      let back = (todayDow - weekday + 7) % 7;
      const prev = tokens[i - 1];
      if (direction === 'future') {
        const ahead = (weekday - todayDow + 7) % 7 || 7;
        const indexes = prev === 'on' || prev === 'next' || prev === 'this' ? [i - 1, i] : [i];
        return { date: addDays(today, ahead), indexes };
      }
      if (prev === 'last' && back === 0) back = 7;
      const indexes = prev === 'last' || prev === 'on' || prev === 'this' ? [i - 1, i] : [i];
      return { date: addDays(today, -back), indexes };
    }

    // "the 3rd", "on the 3rd of march", "3rd march", "march 3rd", "on 3 march"
    const day = ordinal(t) ?? (tokens[i - 1] === 'the' ? (ORDINAL_WORDS[t] ?? null) : null);
    const monthAfter = (k: number) => {
      if (tokens[k] === 'of') k += 1;
      const m = MONTH_SHORT[tokens[k] ?? ''];
      return m === undefined ? null : { month: m, end: k };
    };
    if (day !== null) {
      const indexes = [i];
      let k = i - 1;
      while (k >= 0 && (tokens[k] === 'the' || tokens[k] === 'on')) indexes.unshift(k--);
      const after = monthAfter(i + 1);
      if (after) {
        for (let j = i + 1; j <= after.end; j += 1) indexes.push(j);
        return { date: resolveDayOfMonth(today, day, direction, after.month), indexes };
      }
      const before = MONTH_SHORT[tokens[i - 1] ?? ''];
      if (before !== undefined) {
        return {
          date: resolveDayOfMonth(today, day, direction, before),
          indexes: [i - 1, ...indexes],
        };
      }
      return { date: resolveDayOfMonth(today, day, direction), indexes };
    }
    // Plain number followed by a month: "3 march".
    if (/^\d{1,2}$/.test(t)) {
      const after = monthAfter(i + 1);
      const n = Number(t);
      if (after && n >= 1 && n <= 31) {
        const indexes = tokens[i - 1] === 'on' ? [i - 1, i] : [i];
        for (let j = i + 1; j <= after.end; j += 1) indexes.push(j);
        return { date: resolveDayOfMonth(today, n, direction, after.month), indexes };
      }
    }
  }
  return null;
}
