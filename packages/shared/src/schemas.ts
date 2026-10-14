import { z } from 'zod';

import { CATEGORY_COLORS } from './categories';
import { CURRENCIES } from './money';

export const WALLET_TYPES = ['cash', 'mobile_money', 'bank', 'card', 'savings'] as const;
export type WalletType = (typeof WALLET_TYPES)[number];

export const TRANSACTION_TYPES = ['expense', 'income', 'transfer'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_SOURCES = ['voice', 'keyboard', 'shared_sms', 'receipt'] as const;
export type TransactionSource = (typeof TRANSACTION_SOURCES)[number];

const currencyCodes = Object.keys(CURRENCIES) as [keyof typeof CURRENCIES];
const colorKeys = Object.keys(CATEGORY_COLORS) as [keyof typeof CATEGORY_COLORS];

/** Integer minor units (UGX = whole shillings). */
const minorAmount = z.number().int();

export const WalletInputSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(40, 'Keep it under 40 characters'),
  type: z.enum(WALLET_TYPES),
  provider: z.string().trim().max(40).nullable(),
  currency: z.enum(currencyCodes),
  openingBalance: minorAmount,
  color: z.enum(colorKeys),
});
export type WalletInput = z.infer<typeof WalletInputSchema>;

export const TagInputSchema = z.object({
  name: z.string().trim().min(1, 'Enter a tag').max(24, 'Keep it under 24 characters'),
});

export const TransactionInputSchema = z
  .object({
    type: z.enum(TRANSACTION_TYPES),
    amount: minorAmount.positive('Enter an amount'),
    walletId: z.string().min(1, 'Choose a wallet'),
    toWalletId: z.string().nullable(),
    categoryId: z.string().nullable(),
    occurredAt: z.date(),
    note: z.string().trim().max(200, 'Keep the note under 200 characters'),
    feeAmount: minorAmount.nonnegative(),
    tagIds: z.array(z.string()),
  })
  .superRefine((tx, ctx) => {
    if (tx.type === 'transfer') {
      if (!tx.toWalletId) {
        ctx.addIssue({ code: 'custom', path: ['toWalletId'], message: 'Choose where it goes' });
      } else if (tx.toWalletId === tx.walletId) {
        ctx.addIssue({ code: 'custom', path: ['toWalletId'], message: 'Pick a different wallet' });
      }
    } else if (!tx.categoryId) {
      ctx.addIssue({ code: 'custom', path: ['categoryId'], message: 'Choose a category' });
    }
  });
export type TransactionInput = z.infer<typeof TransactionInputSchema>;
