import { CATEGORY_SEEDS } from '@meledger/shared';
import { count } from 'drizzle-orm';

import { WALLET_TYPE_META } from '@/features/wallets/logic';

import { db } from './client';
import { created, newId } from './ids';
import { categories, profile, wallets } from './schema';

/**
 * First-launch data: the profile row, system categories and a Cash main wallet.
 * Idempotent: the profile and wallet only run while their table is empty (deleted rows count),
 * and system categories added in later versions are inserted by their fixed id.
 */
export function seedDatabase(): void {
  const stamps = created();
  db.transaction((tx) => {
    const [profiles] = tx.select({ n: count() }).from(profile).all();
    if (profiles.n === 0) {
      tx.insert(profile)
        .values({ id: newId(), ...stamps })
        .run();
    }

    const existing = new Set(
      tx
        .select({ id: categories.id })
        .from(categories)
        .all()
        .map((c) => c.id),
    );
    CATEGORY_SEEDS.forEach((seed, sort) => {
      if (existing.has(seed.id)) return;
      tx.insert(categories)
        .values({ ...seed, ...stamps, isSystem: true, sort })
        .run();
    });

    const [walletRows] = tx.select({ n: count() }).from(wallets).all();
    if (walletRows.n === 0) {
      const cash = WALLET_TYPE_META.cash;
      tx.insert(wallets)
        .values({
          id: newId(),
          ...stamps,
          name: 'Cash',
          type: 'cash',
          currency: 'UGX',
          openingBalance: 0,
          color: cash.color,
          icon: cash.icon,
          sort: 0,
        })
        .run();
    }
  });
}
