import { create } from 'zustand';

export interface SnackbarMessage {
  message: string;
  action?: { label: string; onPress: () => void };
  /** Milliseconds; defaults to 3000. */
  duration?: number;
}

interface SnackbarState {
  current: (SnackbarMessage & { key: number }) | null;
  show: (message: SnackbarMessage) => void;
  dismiss: () => void;
}

/** One app-wide snackbar, rendered above the tab bar. */
export const useSnackbar = create<SnackbarState>((set) => ({
  current: null,
  show: (message) => set({ current: { ...message, key: Date.now() } }),
  dismiss: () => set({ current: null }),
}));

export const showSnackbar = (message: SnackbarMessage) => useSnackbar.getState().show(message);
