/* Development only: realistic entries for trying the app and taking screenshots. Reached from the
 * Expo dev menu (see devMenu.ts), never from the app's own screens. */
import { CATEGORY_SEEDS, type TransactionType, type WalletType } from '@meledger/shared';
import { subDays } from 'date-fns';
import { isNull, like } from 'drizzle-orm';

import { db } from '@/db/client';
import { transactions, wallets } from '@/db/schema';

/** Sample rows get ids with this prefix, so they can be removed without touching real ones. */
const PREFIX = 'sample-';

interface Sample {
  daysAgo: number;
  /** Hour of the day. */
  hour: number;
  type: TransactionType;
  amount: number;
  /** System category name (ignored for transfers). */
  category?: string;
  wallet: WalletType;
  toWallet?: WalletType;
  fee?: number;
  note: string;
}

const SAMPLES: Sample[] = [
  {
    daysAgo: 0,
    hour: 8,
    type: 'expense',
    amount: 5_000,
    category: 'Boda/Taxi',
    wallet: 'cash',
    note: 'Boda to town',
  },
  {
    daysAgo: 0,
    hour: 13,
    type: 'expense',
    amount: 12_000,
    category: 'Eating out',
    wallet: 'cash',
    note: 'Rolex and juice',
  },
  {
    daysAgo: 1,
    hour: 9,
    type: 'expense',
    amount: 50_000,
    category: 'Electricity (Yaka)',
    wallet: 'mobile_money',
    note: 'Yaka tokens',
  },
  {
    daysAgo: 1,
    hour: 18,
    type: 'expense',
    amount: 10_000,
    category: 'Airtime & Data',
    wallet: 'mobile_money',
    note: 'Airtime',
  },
  {
    daysAgo: 2,
    hour: 11,
    type: 'expense',
    amount: 85_000,
    category: 'Groceries',
    wallet: 'cash',
    note: 'Market: matooke, beans, posho',
  },
  {
    daysAgo: 3,
    hour: 10,
    type: 'transfer',
    amount: 200_000,
    wallet: 'bank',
    toWallet: 'mobile_money',
    fee: 2_500,
    note: 'Bank to MoMo',
  },
  {
    daysAgo: 4,
    hour: 8,
    type: 'expense',
    amount: 7_000,
    category: 'Coffee & snacks',
    wallet: 'cash',
    note: 'Coffee',
  },
  {
    daysAgo: 4,
    hour: 17,
    type: 'expense',
    amount: 60_000,
    category: 'Fuel',
    wallet: 'mobile_money',
    note: 'Fuel',
  },
  {
    daysAgo: 5,
    hour: 10,
    type: 'expense',
    amount: 20_000,
    category: 'Church/Mosque giving',
    wallet: 'cash',
    note: 'Sunday offering',
  },
  {
    daysAgo: 6,
    hour: 15,
    type: 'income',
    amount: 450_000,
    category: 'Freelance/Contract',
    wallet: 'mobile_money',
    note: 'Logo design',
  },
  {
    daysAgo: 8,
    hour: 19,
    type: 'expense',
    amount: 25_000,
    category: 'Airtime & Data',
    wallet: 'mobile_money',
    note: 'Monthly data bundle',
  },
  {
    daysAgo: 8,
    hour: 7,
    type: 'expense',
    amount: 8_000,
    category: 'Boda/Taxi',
    wallet: 'cash',
    note: 'SafeBoda',
  },
  {
    daysAgo: 10,
    hour: 12,
    type: 'expense',
    amount: 120_000,
    category: 'Groceries',
    wallet: 'cash',
    note: 'Supermarket',
  },
  {
    daysAgo: 10,
    hour: 16,
    type: 'expense',
    amount: 35_000,
    category: 'Water',
    wallet: 'mobile_money',
    note: 'NWSC bill',
  },
  {
    daysAgo: 12,
    hour: 20,
    type: 'expense',
    amount: 30_000,
    category: 'Eating out',
    wallet: 'cash',
    note: 'Supper with friends',
  },
  {
    daysAgo: 12,
    hour: 14,
    type: 'expense',
    amount: 50_000,
    category: 'Contributions (weddings, burials)',
    wallet: 'mobile_money',
    note: 'Wedding contribution',
  },
  {
    daysAgo: 14,
    hour: 9,
    type: 'income',
    amount: 2_400_000,
    category: 'Salary',
    wallet: 'bank',
    note: 'Salary',
  },
  {
    daysAgo: 15,
    hour: 10,
    type: 'expense',
    amount: 600_000,
    category: 'Rent/Mortgage',
    wallet: 'bank',
    note: 'Rent',
  },
  {
    daysAgo: 15,
    hour: 11,
    type: 'expense',
    amount: 350_000,
    category: 'School fees',
    wallet: 'bank',
    note: 'School fees, first instalment',
  },
  {
    daysAgo: 18,
    hour: 16,
    type: 'expense',
    amount: 90_000,
    category: 'Clothes',
    wallet: 'cash',
    note: 'Owino: shirts',
  },
  {
    daysAgo: 18,
    hour: 8,
    type: 'expense',
    amount: 6_000,
    category: 'Boda/Taxi',
    wallet: 'cash',
    note: 'Boda',
  },
  {
    daysAgo: 21,
    hour: 10,
    type: 'expense',
    amount: 105_000,
    category: 'Internet',
    wallet: 'mobile_money',
    note: 'Home wifi',
  },
  {
    daysAgo: 21,
    hour: 17,
    type: 'expense',
    amount: 95_000,
    category: 'Groceries',
    wallet: 'cash',
    note: 'Market',
  },
  {
    daysAgo: 25,
    hour: 13,
    type: 'expense',
    amount: 22_000,
    category: 'Medication',
    wallet: 'cash',
    note: 'Pharmacy',
  },
  {
    daysAgo: 25,
    hour: 20,
    type: 'expense',
    amount: 25_000,
    category: 'Movies',
    wallet: 'mobile_money',
    note: 'Cinema',
  },
  {
    daysAgo: 28,
    hour: 9,
    type: 'expense',
    amount: 70_000,
    category: 'Fuel',
    wallet: 'mobile_money',
    note: 'Fuel',
  },
  {
    daysAgo: 28,
    hour: 18,
    type: 'expense',
    amount: 100_000,
    category: 'Family support',
    wallet: 'mobile_money',
    note: 'Sent to mum',
  },
  {
    daysAgo: 33,
    hour: 11,
    type: 'expense',
    amount: 110_000,
    category: 'Groceries',
    wallet: 'cash',
    note: 'Market',
  },
  {
    daysAgo: 33,
    hour: 9,
    type: 'expense',
    amount: 50_000,
    category: 'Electricity (Yaka)',
    wallet: 'mobile_money',
    note: 'Yaka tokens',
  },
  {
    daysAgo: 38,
    hour: 10,
    type: 'expense',
    amount: 600_000,
    category: 'Rent/Mortgage',
    wallet: 'bank',
    note: 'Rent',
  },
  {
    daysAgo: 38,
    hour: 19,
    type: 'expense',
    amount: 40_000,
    category: 'Eating out',
    wallet: 'cash',
    note: 'Pizza night',
  },
  {
    daysAgo: 42,
    hour: 9,
    type: 'income',
    amount: 2_400_000,
    category: 'Salary',
    wallet: 'bank',
    note: 'Salary',
  },
  {
    daysAgo: 44,
    hour: 8,
    type: 'expense',
    amount: 5_000,
    category: 'Boda/Taxi',
    wallet: 'cash',
    note: 'Boda',
  },
];

/**
 * Adds about six weeks of everyday Ugandan entries to the existing wallets (by type, falling back
 * to the main wallet). Running it again replaces the earlier samples. Returns how many were added.
 */
export async function addSampleData(): Promise<number> {
  await removeSampleData();
  const walletRows = await db.select().from(wallets).where(isNull(wallets.deletedAt));
  const active = walletRows.filter((w) => !w.archived).sort((a, b) => a.sort - b.sort);
  const main = active[0];
  if (!main) return 0;
  const walletFor = (type: WalletType) => active.find((w) => w.type === type) ?? main;
  const categoryId = (name: string | undefined) =>
    CATEGORY_SEEDS.find((c) => c.name === name)?.id ?? null;
  const now = new Date();

  const rows = SAMPLES.map((s, i) => {
    const at = subDays(now, s.daysAgo);
    at.setHours(s.hour, (i * 7) % 60, 0, 0);
    // Today's samples never land in the future.
    const occurredAt = at > now ? now : at;
    const from = walletFor(s.wallet);
    const to = s.toWallet ? walletFor(s.toWallet) : null;
    const transfer = s.type === 'transfer' && to !== null && to.id !== from.id;
    return {
      id: `${PREFIX}${i}`,
      createdAt: occurredAt,
      updatedAt: occurredAt,
      // With a single wallet there is nowhere to transfer to, so that sample is left out.
      type: transfer ? ('transfer' as const) : s.type === 'transfer' ? null : s.type,
      amount: s.amount,
      currency: 'UGX',
      walletId: from.id,
      toWalletId: transfer ? to.id : null,
      categoryId: s.type === 'transfer' ? null : categoryId(s.category),
      occurredAt,
      note: s.note,
      feeAmount: transfer ? (s.fee ?? 0) : 0,
      source: 'keyboard' as const,
    };
  });
  const usable = rows.flatMap((r) => (r.type === null ? [] : [{ ...r, type: r.type }]));
  await db.insert(transactions).values(usable);
  return usable.length;
}

/** Deletes the sample entries (only rows added by addSampleData). */
export async function removeSampleData(): Promise<void> {
  await db.delete(transactions).where(like(transactions.id, `${PREFIX}%`));
}
