/** Words that split one utterance into several items (only when each part has an amount). */
export const SEPARATORS = new Set([',', ';', '&', 'and', 'then', 'plus', 'also']);

/**
 * Lowercases and splits a transcript into word, number and punctuation tokens.
 * Ordinals ("3rd"), times ("5pm") and data sizes ("500mb") stay single tokens so they are
 * never read as amounts; "5k" and "1.2m" split into a number and a multiplier.
 */
export function tokenize(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .replace(/[‘’`]/g, "'")
    .replace(/\bugx(?=\d)/g, 'ugx ')
    .replace(/\bshs?\.?(?=\d)/g, 'shs ');
  const pattern =
    /\d+(?:st|nd|rd|th)\b|\d+(?::\d+)?\s?(?:am|pm)\b|\d+(?:\.\d+)?\s?(?:mb|gb)\b|\$|\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?|[a-z]+(?:'[a-z]+)?|[,;&?]/g;
  return (normalized.match(pattern) ?? []).map((t) => t.replace(/\s+/g, '').replace(/'/g, ''));
}

const UNITS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fourty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

const THOUSAND = new Set(['k', 'thousand', 'thousands', 'thou', 'grand']);
const MILLION = new Set(['m', 'million', 'millions', 'mil', 'milli']);
const USD_BEFORE = new Set(['$', 'usd']);
const USD_AFTER = new Set(['dollars', 'dollar', 'usd', 'bucks']);
const UGX_MARKERS = new Set(['ugx', 'shs', 'sh', 'shillings', 'shilling', 'ush']);

const isDigits = (t: string) => /^\d[\d,]*(?:\.\d+)?$/.test(t);
const isMultiplier = (t: string | undefined) =>
  t !== undefined && (THOUSAND.has(t) || MILLION.has(t) || t === 'hundred');
const isNumberWord = (t: string | undefined) => t !== undefined && (t in UNITS || isMultiplier(t));

export interface AmountMatch {
  /** Value in major units (e.g. 5000 UGX, 20.5 USD). */
  value: number;
  currency: 'UGX' | 'USD' | null;
  /** Token range [start, end) including currency markers. */
  start: number;
  end: number;
  /** Spoken as words ("fifty thousand") rather than digits. */
  words: boolean;
  /** Has a multiplier (k, m, thousand) or a currency marker. */
  marked: boolean;
}

/**
 * Reads the amount starting at `start`, or returns null. Handles digits with separators,
 * k/m suffixes, number words ("two hundred k", "twenty five thousand") and currency markers.
 */
export function readAmount(tokens: readonly string[], start: number): AmountMatch | null {
  let i = start;
  let currency: AmountMatch['currency'] = null;
  if (USD_BEFORE.has(tokens[i] ?? '')) {
    currency = 'USD';
    i += 1;
  } else if (UGX_MARKERS.has(tokens[i] ?? '')) {
    currency = 'UGX';
    i += 1;
  }

  const first = tokens[i];
  const startsWithA = first === 'a' && isMultiplier(tokens[i + 1]);
  if (first === undefined || !(isDigits(first) || first in UNITS || startsWithA)) return null;

  let total = 0;
  let current = 0;
  let words = false;
  let marked = currency !== null;
  let sawDigits = false;

  while (i < tokens.length) {
    const t = tokens[i]!;
    if (isDigits(t)) {
      if (sawDigits || words) break;
      current += parseFloat(t.replace(/,/g, ''));
      sawDigits = true;
    } else if (t === 'a' && i === start + (currency ? 1 : 0) && isMultiplier(tokens[i + 1])) {
      current = 1;
      words = true;
    } else if (t in UNITS) {
      if (sawDigits) break;
      current += UNITS[t]!;
      words = true;
    } else if (t === 'hundred') {
      current = (current || 1) * 100;
    } else if (THOUSAND.has(t)) {
      total += (current || 1) * 1_000;
      current = 0;
      marked = true;
    } else if (MILLION.has(t)) {
      total += (current || 1) * 1_000_000;
      current = 0;
      marked = true;
    } else if (t === 'and' && words && isNumberWord(tokens[i + 1]) && tokens[i - 1] !== 'and') {
      // "two hundred and fifty thousand": the "and" belongs to the number.
    } else {
      break;
    }
    i += 1;
  }

  if (USD_AFTER.has(tokens[i] ?? '')) {
    currency = 'USD';
    marked = true;
    i += 1;
  } else if (UGX_MARKERS.has(tokens[i] ?? '')) {
    currency ??= 'UGX';
    marked = true;
    i += 1;
  }

  const value = total + current;
  if (value <= 0) return null;
  return { value, currency, start, end: i, words, marked };
}

/** True when the "and" at `index` sits inside a spoken number ("two hundred and fifty"). */
export function isNumberAnd(tokens: readonly string[], index: number): boolean {
  const prev = tokens[index - 1];
  const next = tokens[index + 1];
  // "5 thousand and two sodas 2k" is two items: only spoken numbers continue over "and".
  let j = index - 1;
  while (j >= 0 && isNumberWord(tokens[j])) j -= 1;
  if (j >= 0 && isDigits(tokens[j]!)) return false;
  return (
    tokens[index] === 'and' &&
    (prev === 'hundred' || THOUSAND.has(prev ?? '') || MILLION.has(prev ?? '')) &&
    next !== undefined &&
    next in UNITS
  );
}
