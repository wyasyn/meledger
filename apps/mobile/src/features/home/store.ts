import { startOfMonth } from 'date-fns';
import { create } from 'zustand';

interface HomeState {
  /** First day of the month shown on Home. */
  month: Date;
  /** Wallet the transaction list is filtered to; null shows all wallets. */
  walletId: string | null;
  setMonth: (month: Date) => void;
  setWalletId: (walletId: string | null) => void;
}

export const useHomeStore = create<HomeState>((set) => ({
  month: startOfMonth(new Date()),
  walletId: null,
  setMonth: (month) => set({ month: startOfMonth(month) }),
  setWalletId: (walletId) => set({ walletId }),
}));
