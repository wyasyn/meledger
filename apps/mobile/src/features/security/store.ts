import { create } from 'zustand';

interface LockState {
  locked: boolean;
  /** When the app went to the background, for the lock delay. */
  backgroundAt: number | null;
  /** The system prompt is open; leaving the app for it must not count as backgrounding. */
  authenticating: boolean;
  set: (patch: Partial<Omit<LockState, 'set'>>) => void;
}

export const useLock = create<LockState>((set) => ({
  locked: false,
  backgroundAt: null,
  authenticating: false,
  set: (patch) => set(patch),
}));
