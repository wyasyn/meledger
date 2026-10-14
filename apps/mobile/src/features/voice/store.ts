import { create } from 'zustand';

interface VoiceHoldState {
  /** True while the tab bar mic is held down (hold-to-talk). */
  holding: boolean;
  setHolding: (holding: boolean) => void;
}

/** Hold-to-talk: the tab bar mic sets this; the voice screen stops listening on release. */
export const useVoiceHold = create<VoiceHoldState>((set) => ({
  holding: false,
  setHolding: (holding) => set({ holding }),
}));

/** What the sheet opens for: listening (optionally with a preferred wallet) or editing an entry. */
export type VoiceSheetRequest =
  { mode: 'listen'; walletId: string | null } | { mode: 'edit'; transactionId: string };

interface VoiceSheetState {
  /** Bumped on each open request; the sheet host presents when it changes. */
  requestId: number;
  request: VoiceSheetRequest;
  open: (request: VoiceSheetRequest) => void;
}

export const useVoiceSheet = create<VoiceSheetState>((set) => ({
  requestId: 0,
  request: { mode: 'listen', walletId: null },
  open: (request) => set((s) => ({ requestId: s.requestId + 1, request })),
}));

/**
 * Opens the voice sheet (listening) over the current screen. `walletId` makes that wallet the
 * default for what is said or typed (e.g. Home filtered to one wallet).
 */
export const openVoiceSheet = (walletId: string | null = null) =>
  useVoiceSheet.getState().open({ mode: 'listen', walletId });

/** Opens an existing entry in the same sheet, as an editable card. */
export const openEntrySheet = (transactionId: string) =>
  useVoiceSheet.getState().open({ mode: 'edit', transactionId });
