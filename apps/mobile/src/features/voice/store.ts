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

interface VoiceSheetState {
  /** Bumped on each open request; the sheet host presents when it changes. */
  requestId: number;
  open: () => void;
}

export const useVoiceSheet = create<VoiceSheetState>((set) => ({
  requestId: 0,
  open: () => set((s) => ({ requestId: s.requestId + 1 })),
}));

/** Opens the voice sheet (listening) over the current screen. */
export const openVoiceSheet = () => useVoiceSheet.getState().open();
