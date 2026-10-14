import { create } from 'zustand';

export type PermissionKind = 'microphone' | 'notifications' | 'biometrics';

interface PermissionSheetState {
  kind: PermissionKind | null;
  show: (kind: PermissionKind) => void;
  hide: () => void;
}

/**
 * Which permission explanation is open. Permissions are only requested during onboarding;
 * anywhere else a denied feature opens this sheet, which links to the app's Android settings.
 */
export const usePermissionSheet = create<PermissionSheetState>((set) => ({
  kind: null,
  show: (kind) => set({ kind }),
  hide: () => set({ kind: null }),
}));

export const showPermissionSheet = (kind: PermissionKind) =>
  usePermissionSheet.getState().show(kind);
