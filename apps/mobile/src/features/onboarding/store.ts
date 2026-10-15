import type { WalletType } from '@meledger/shared';
import { create } from 'zustand';

export type IncomeKind = 'salary' | 'freelance' | 'business' | 'irregular';

export interface WalletChoice {
  key: string;
  name: string;
  type: WalletType;
  provider: string | null;
  selected: boolean;
  balance: number;
}

export interface GoalChoice {
  name: string;
  icon: string;
  /** Palette key. */
  color: string;
  target: number;
}

interface OnboardingDraft {
  monthStartDay: number;
  wallets: WalletChoice[];
  incomeKind: IncomeKind | null;
  usualIncome: number;
  payDay: number | null;
  goal: GoalChoice | null;
  reminderOn: boolean;
  reminderTime: string;
  biometricLock: boolean;
  set: (changes: Partial<Omit<OnboardingDraft, 'set' | 'updateWallet'>>) => void;
  updateWallet: (key: string, changes: Partial<WalletChoice>) => void;
}

/** Answers collected across the onboarding steps; saved together on the last step. */
export const useOnboarding = create<OnboardingDraft>((set) => ({
  monthStartDay: 1,
  wallets: [
    { key: 'cash', name: 'Cash', type: 'cash', provider: null, selected: true, balance: 0 },
    {
      key: 'mtn',
      name: 'MTN MoMo',
      type: 'mobile_money',
      provider: 'MTN',
      selected: false,
      balance: 0,
    },
    {
      key: 'airtel',
      name: 'Airtel Money',
      type: 'mobile_money',
      provider: 'Airtel',
      selected: false,
      balance: 0,
    },
    { key: 'bank', name: 'Bank', type: 'bank', provider: null, selected: false, balance: 0 },
    { key: 'card', name: 'Card', type: 'card', provider: null, selected: false, balance: 0 },
  ],
  incomeKind: null,
  usualIncome: 0,
  payDay: null,
  goal: null,
  reminderOn: true,
  reminderTime: '20:00',
  biometricLock: false,
  set: (changes) => set(changes),
  updateWallet: (key, changes) =>
    set((s) => ({ wallets: s.wallets.map((w) => (w.key === key ? { ...w, ...changes } : w)) })),
}));
