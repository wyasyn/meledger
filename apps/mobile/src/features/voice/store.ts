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
