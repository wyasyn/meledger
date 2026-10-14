import { create } from 'zustand';

import { monthPeriod, type Period } from './logic';

interface HomeState {
  /** Date range shown on Home (cards and transaction list). */
  period: Period;
  /** Wallet the transaction list is filtered to; null shows all wallets. */
  walletId: string | null;
  setPeriod: (period: Period) => void;
  setWalletId: (walletId: string | null) => void;
}

export const useHomeStore = create<HomeState>((set) => ({
  period: monthPeriod(new Date()),
  walletId: null,
  setPeriod: (period) => set({ period }),
  setWalletId: (walletId) => set({ walletId }),
}));
