import { CATEGORY_COLORS, type CategoryColor } from '@meledger/shared';
import { isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import { created, newId } from '@/db/ids';
import { goals, wallets } from '@/db/schema';
import { updateProfile } from '@/features/profile/repo';
import { WALLET_TYPE_META } from '@/features/wallets/logic';
import { createWallet, updateWallet, walletHasTransactions } from '@/features/wallets/repo';

import { useOnboarding } from './store';

const asColor = (c: string): CategoryColor =>
  c in CATEGORY_COLORS ? (c as CategoryColor) : 'slate';

/**
 * Saves the chosen wallets. Runs when leaving the wallets step, so the "Try it" step can save a
 * real entry, and again on finish. Wallets that already exist (matched by name) are kept, and
 * their balance is only set while they have no entries, so existing data never shifts.
 */
export async function saveOnboardingWallets(): Promise<void> {
  const draft = useOnboarding.getState();
  const existing = await db.select().from(wallets).where(isNull(wallets.deletedAt));

  for (const choice of draft.wallets.filter((w) => w.selected)) {
    const match = existing.find((w) => w.name.toLowerCase() === choice.name.toLowerCase());
    const input = {
      name: choice.name,
      type: choice.type,
      provider: choice.provider,
      currency: 'UGX' as const,
      openingBalance: choice.balance,
      color: WALLET_TYPE_META[choice.type].color,
    };
    if (!match) {
      await createWallet(input);
    } else if (choice.balance > 0 && !(await walletHasTransactions(match.id))) {
      await updateWallet(match.id, { ...input, color: asColor(match.color) });
    }
  }
}

/** Saves every onboarding answer. */
export async function finishOnboarding(): Promise<void> {
  const draft = useOnboarding.getState();
  await saveOnboardingWallets();

  if (draft.goal) {
    await db.insert(goals).values({
      id: newId(),
      ...created(),
      name: draft.goal.name,
      icon: draft.goal.icon,
      targetAmount: draft.goal.target,
      status: 'active',
    });
  }

  await updateProfile({
    monthStartDay: draft.monthStartDay,
    incomeKind: draft.incomeKind,
    usualIncome: draft.usualIncome || null,
    payDay: draft.payDay,
    reminderOn: draft.reminderOn,
    reminderTime: draft.reminderTime,
    biometricLock: draft.biometricLock,
    onboardingDone: true,
  });
}
