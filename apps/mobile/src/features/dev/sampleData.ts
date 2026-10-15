/* Development only: realistic entries and plan items for trying the app and taking screenshots. Reached from the
 * Expo dev menu (see devMenu.ts), never from the app's own screens. */
import {
  CATEGORY_SEEDS,
  DEBT_CATEGORY_IDS,
  type TransactionType,
  type WalletType,
} from '@meledger/shared';
import { addDays, subDays } from 'date-fns';
import { isNull, like } from 'drizzle-orm';

import { db } from '@/db/client';
import {
  budgets,
  debts,
  goalContributions,
  goals,
  people,
  recurringRules,
  savingsGroups,
  transactions,
  wallets,
} from '@/db/schema';

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

/** Days from now as a date at a given hour (negative = past). */
function day(offset: number, hour = 10): Date {
  const d = addDays(new Date(), offset);
  d.setHours(hour, 0, 0, 0);
  return d;
}

const categoryId = (name: string) => CATEGORY_SEEDS.find((c) => c.name === name)?.id ?? null;

/**
 * Adds about six weeks of everyday Ugandan entries to the existing wallets (by type, falling back
 * to the main wallet), plus something in every Plan section: goals, budgets, recurring bills,
 * debts and a savings group. Running it again replaces the earlier samples. Returns how many
 * entries were added.
 */
export async function addSampleData(): Promise<number> {
  await removeSampleData();
  const walletRows = await db.select().from(wallets).where(isNull(wallets.deletedAt));
  const active = walletRows.filter((w) => !w.archived).sort((a, b) => a.sort - b.sort);
  const main = active[0];
  if (!main) return 0;
  const walletFor = (type: WalletType) => active.find((w) => w.type === type) ?? main;
  const now = new Date();

  type TxRow = typeof transactions.$inferInsert;
  const entry = (id: string, row: Omit<TxRow, 'id' | 'createdAt' | 'updatedAt'>): TxRow => ({
    id: `${PREFIX}${id}`,
    createdAt: row.occurredAt,
    updatedAt: row.occurredAt,
    currency: 'UGX',
    source: 'keyboard',
    ...row,
  });

  const rows: TxRow[] = SAMPLES.flatMap((s, i) => {
    const at = subDays(now, s.daysAgo);
    at.setHours(s.hour, (i * 7) % 60, 0, 0);
    // Today's samples never land in the future.
    const occurredAt = at > now ? now : at;
    const from = walletFor(s.wallet);
    const to = s.toWallet ? walletFor(s.toWallet) : null;
    if (s.type === 'transfer') {
      // With a single wallet there is nowhere to transfer to, so that sample is left out.
      if (!to || to.id === from.id) return [];
      return [
        entry(`tx-${i}`, {
          type: 'transfer',
          amount: s.amount,
          walletId: from.id,
          toWalletId: to.id,
          occurredAt,
          note: s.note,
          feeAmount: s.fee ?? 0,
        }),
      ];
    }
    return [
      entry(`tx-${i}`, {
        type: s.type,
        amount: s.amount,
        walletId: from.id,
        categoryId: s.category ? categoryId(s.category) : null,
        occurredAt,
        note: s.note,
      }),
    ];
  });

  const momo = walletFor('mobile_money');
  const stamps = (at: Date) => ({ createdAt: at, updatedAt: at });

  // Goals: one behind schedule (orange band), one on track (green band).
  const laptop = `${PREFIX}goal-laptop`;
  const land = `${PREFIX}goal-land`;
  const goalRows = [
    {
      id: laptop,
      ...stamps(day(-120)),
      name: 'New laptop',
      icon: 'electronics',
      color: 'blue',
      targetAmount: 3_500_000,
      targetDate: day(60),
      status: 'active' as const,
    },
    {
      id: land,
      ...stamps(day(-30)),
      name: 'Plot in Mukono',
      icon: 'land',
      color: 'teal',
      targetAmount: 20_000_000,
      targetDate: day(330),
      status: 'active' as const,
    },
  ];
  const contributionRows = [
    { goalId: laptop, amount: 400_000, at: day(-100) },
    { goalId: laptop, amount: 300_000, at: day(-60) },
    { goalId: laptop, amount: 250_000, at: day(-14) },
    { goalId: land, amount: 1_500_000, at: day(-28) },
    { goalId: land, amount: 500_000, at: day(-7) },
  ].map((c, i) => ({
    id: `${PREFIX}contribution-${i}`,
    ...stamps(c.at),
    goalId: c.goalId,
    amount: c.amount,
    occurredAt: c.at,
  }));

  // Budgets: comfortable, close to the limit, over the limit, and a weekly one.
  const budgetRows = [
    { name: 'Groceries', limit: 500_000, period: 'monthly' as const },
    { name: 'Electricity (Yaka)', limit: 60_000, period: 'monthly' as const },
    { name: 'Airtime & Data', limit: 30_000, period: 'monthly' as const },
    { name: 'Eating out', limit: 50_000, period: 'weekly' as const },
  ].flatMap((b, i) => {
    const id = categoryId(b.name);
    return id
      ? [
          {
            id: `${PREFIX}budget-${i}`,
            ...stamps(day(-40)),
            categoryId: id,
            period: b.period,
            limitAmount: b.limit,
            alertAt: 80,
          },
        ]
      : [];
  });

  // Recurring bills: overdue, due soon and later.
  const bill = (name: string, amount: number, category: string, due: Date, walletId: string) => ({
    id: `${PREFIX}bill-${name.toLowerCase().replace(/\W+/g, '-')}`,
    ...stamps(day(-60)),
    name,
    template: JSON.stringify({
      type: 'expense',
      amount,
      walletId,
      categoryId: categoryId(category),
      note: name,
    }),
    frequency: 'monthly' as const,
    nextDueAt: due,
    mode: 'remind' as const,
  });
  const billRows = [
    bill('Home wifi', 105_000, 'Internet', day(-2, 9), momo.id),
    bill('Rent', 600_000, 'Rent/Mortgage', day(3, 9), walletFor('bank').id),
    bill('Yaka', 50_000, 'Electricity (Yaka)', day(16, 9), momo.id),
  ];

  // Debts: someone owes the user (part repaid), and the user owes someone.
  const kato = `${PREFIX}person-kato`;
  const nakato = `${PREFIX}person-nakato`;
  const lent = `${PREFIX}debt-kato`;
  const borrowed = `${PREFIX}debt-nakato`;
  const personRows = [
    { id: kato, ...stamps(day(-20)), name: 'Kato' },
    { id: nakato, ...stamps(day(-10)), name: 'Nakato' },
  ];
  const debtRows = [
    {
      id: lent,
      ...stamps(day(-20)),
      personId: kato,
      direction: 'owed_to_me' as const,
      principal: 200_000,
      dueAt: day(10),
      status: 'open' as const,
      note: 'For his school fees',
      startedAt: day(-20),
    },
    {
      id: borrowed,
      ...stamps(day(-10)),
      personId: nakato,
      direction: 'i_owe' as const,
      principal: 150_000,
      dueAt: day(14),
      status: 'open' as const,
      note: null,
      startedAt: day(-10),
    },
  ];
  rows.push(
    entry('debt-kato-lent', {
      type: 'expense',
      amount: 200_000,
      walletId: momo.id,
      categoryId: DEBT_CATEGORY_IDS.lent,
      occurredAt: day(-20, 12),
      note: 'Lent to Kato',
      debtId: lent,
    }),
    entry('debt-kato-repaid', {
      type: 'income',
      amount: 80_000,
      walletId: momo.id,
      categoryId: DEBT_CATEGORY_IDS.repaidToMe,
      occurredAt: day(-5, 18),
      note: 'Kato paid back',
      debtId: lent,
    }),
    entry('debt-nakato-borrowed', {
      type: 'income',
      amount: 150_000,
      walletId: main.id,
      categoryId: DEBT_CATEGORY_IDS.borrowed,
      occurredAt: day(-10, 15),
      note: 'Borrowed from Nakato',
      debtId: borrowed,
    }),
  );

  // Savings group: its own savings wallet, three weekly contributions, payout coming up.
  const groupWallet = `${PREFIX}wallet-chama`;
  const groupStart = day(-21, 9);
  const walletRow = {
    id: groupWallet,
    ...stamps(groupStart),
    name: 'Office chama',
    type: 'savings' as const,
    provider: 'Savings group',
    currency: 'UGX',
    openingBalance: 0,
    color: 'teal',
    icon: 'piggy-bank',
    sort: Math.max(...walletRows.map((w) => w.sort)) + 1,
  };
  const groupRow = {
    id: `${PREFIX}group-chama`,
    ...stamps(groupStart),
    name: 'Office chama',
    walletId: groupWallet,
    contributionAmount: 50_000,
    frequency: 'weekly' as const,
    members: JSON.stringify(['Amina', 'Okello', 'Sarah', 'Brian']),
    payoutTurn: 5,
    cycleStart: groupStart,
  };
  for (const week of [0, 1, 2]) {
    rows.push(
      entry(`chama-${week}`, {
        type: 'transfer',
        amount: 50_000,
        walletId: momo.id,
        toWalletId: groupWallet,
        occurredAt: addDays(groupStart, week * 7),
        note: 'Office chama contribution',
        feeAmount: momo.id === main.id ? 0 : 500,
      }),
    );
  }

  db.transaction((tx) => {
    tx.insert(wallets).values(walletRow).run();
    tx.insert(transactions).values(rows).run();
    tx.insert(goals).values(goalRows).run();
    tx.insert(goalContributions).values(contributionRows).run();
    if (budgetRows.length > 0) tx.insert(budgets).values(budgetRows).run();
    tx.insert(recurringRules).values(billRows).run();
    tx.insert(people).values(personRows).run();
    tx.insert(debts).values(debtRows).run();
    tx.insert(savingsGroups).values(groupRow).run();
  });
  return rows.length;
}

/** Deletes everything addSampleData added (only rows with sample ids). */
export async function removeSampleData(): Promise<void> {
  const sample = `${PREFIX}%`;
  db.transaction((tx) => {
    tx.delete(transactions).where(like(transactions.id, sample)).run();
    tx.delete(goalContributions).where(like(goalContributions.id, sample)).run();
    tx.delete(goals).where(like(goals.id, sample)).run();
    tx.delete(budgets).where(like(budgets.id, sample)).run();
    tx.delete(recurringRules).where(like(recurringRules.id, sample)).run();
    tx.delete(debts).where(like(debts.id, sample)).run();
    tx.delete(people).where(like(people.id, sample)).run();
    tx.delete(savingsGroups).where(like(savingsGroups.id, sample)).run();
    tx.delete(wallets).where(like(wallets.id, sample)).run();
  });
}
