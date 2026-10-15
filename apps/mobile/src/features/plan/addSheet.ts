import { create } from 'zustand';

/** What can be added to the plan from the add sheet. */
export type PlanKind = 'goal' | 'budget' | 'bill' | 'debt' | 'group';

interface AddPlanSheetState {
  /** Bumped on each open request; the sheet host presents when it changes. */
  requestId: number;
  /** The form showing, or null for the list of what can be added. */
  kind: PlanKind | null;
  open: (kind: PlanKind | null) => void;
  /** Moves from the list to the picked form while the sheet is open. */
  show: (kind: PlanKind | null) => void;
}

export const useAddPlanSheet = create<AddPlanSheetState>((set) => ({
  requestId: 0,
  kind: null,
  open: (kind) => set((s) => ({ requestId: s.requestId + 1, kind })),
  show: (kind) => set({ kind }),
}));

/**
 * Opens the add sheet over the current screen: at the list of what can be added, or straight
 * at one form ("Add a savings group" opens the savings group form).
 */
export const openAddPlan = (kind: PlanKind | null = null) => useAddPlanSheet.getState().open(kind);
