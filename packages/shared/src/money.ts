export const CURRENCIES = {
  UGX: { code: 'UGX', decimals: 0 },
  USD: { code: 'USD', decimals: 2 },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export const DEFAULT_CURRENCY: CurrencyCode = 'UGX';

/** Converts a major-unit amount (e.g. 12.5 USD) to integer minor units (1250). */
export function toMinor(major: number, currency: CurrencyCode): number {
  return Math.round(major * 10 ** CURRENCIES[currency].decimals);
}

/** Converts integer minor units back to a major-unit number. */
export function fromMinor(minor: number, currency: CurrencyCode): number {
  return minor / 10 ** CURRENCIES[currency].decimals;
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Formats the number part of an amount, e.g. 87457 UGX -> "87,457", 1250 USD -> "12.50".
 * Implemented without Intl so output is identical on Hermes and Node.
 */
export function formatAmount(minor: number, currency: CurrencyCode): string {
  if (!Number.isInteger(minor)) {
    throw new RangeError(`Amount must be integer minor units, got ${minor}`);
  }
  const { decimals } = CURRENCIES[currency];
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(minor);
  const divisor = 10 ** decimals;
  const whole = groupThousands(Math.floor(abs / divisor).toString());
  if (decimals === 0) return `${sign}${whole}`;
  const fraction = (abs % divisor).toString().padStart(decimals, '0');
  return `${sign}${whole}.${fraction}`;
}

/** Formats an amount with its currency code, e.g. "UGX 87,457" or "-UGX 12,000". */
export function formatMoney(minor: number, currency: CurrencyCode = DEFAULT_CURRENCY): string {
  const amount = formatAmount(minor, currency);
  return amount.startsWith('-') ? `-${currency} ${amount.slice(1)}` : `${currency} ${amount}`;
}
