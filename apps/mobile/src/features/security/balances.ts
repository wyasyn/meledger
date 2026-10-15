import { create } from 'zustand';

/** What Home shows instead of an amount while balances are hidden. */
export const MASK = '••••••';

/** Tapping the balance reveals amounts until the user leaves Home. */
export const useBalancesRevealed = create<{ revealed: boolean; setRevealed: (r: boolean) => void }>(
  (set) => ({ revealed: false, setRevealed: (revealed) => set({ revealed }) }),
);
