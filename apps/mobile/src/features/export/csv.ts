import { type CurrencyCode, CURRENCIES, fromMinor } from '@meledger/shared';
import { format } from 'date-fns';

export interface CsvEntry {
  occurredAt: Date;
  type: 'expense' | 'income' | 'transfer';
  amount: number;
  currency: string;
  feeAmount: number;
  walletId: string;
  toWalletId: string | null;
  categoryId: string | null;
  note: string | null;
  source: string;
}

export interface CsvLookups {
  wallets: ReadonlyMap<string, string>;
  categories: ReadonlyMap<string, string>;
  /** Tag names per entry id. */
  tags: (entryId: string) => readonly string[];
}

const HEADER = [
  'Date',
  'Type',
  'Amount',
  'Currency',
  'Fee',
  'Wallet',
  'To wallet',
  'Category',
  'Note',
  'Tags',
  'Added by',
];

const TYPE_LABELS = { expense: 'Expense', income: 'Income', transfer: 'Transfer' } as const;

/** Quotes a field when it holds a comma, quote or line break (RFC 4180). */
export function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

const asCurrency = (c: string): CurrencyCode => (c in CURRENCIES ? (c as CurrencyCode) : 'UGX');

/**
 * Every entry as one CSV (newest first, as given): amounts in whole units ("5000", "12.5"),
 * names instead of ids. Opens in Excel and Google Sheets.
 */
export function buildCsv(
  entries: readonly (CsvEntry & { id: string })[],
  lookups: CsvLookups,
): string {
  const rows = entries.map((e) => {
    const currency = asCurrency(e.currency);
    return [
      format(e.occurredAt, 'yyyy-MM-dd HH:mm'),
      TYPE_LABELS[e.type],
      String(fromMinor(e.amount, currency)),
      currency,
      e.feeAmount ? String(fromMinor(e.feeAmount, currency)) : '',
      lookups.wallets.get(e.walletId) ?? '',
      e.toWalletId ? (lookups.wallets.get(e.toWalletId) ?? '') : '',
      e.categoryId ? (lookups.categories.get(e.categoryId) ?? '') : '',
      e.note ?? '',
      lookups.tags(e.id).join('; '),
      e.source === 'voice' ? 'Voice' : 'Keyboard',
    ];
  });
  return [HEADER, ...rows].map((r) => r.map(csvField).join(',')).join('\r\n') + '\r\n';
}
