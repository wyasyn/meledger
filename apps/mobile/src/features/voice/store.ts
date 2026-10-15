import type { TransactionInput } from '@meledger/shared';
import { create } from 'zustand';

import type { RecurringRule } from '@/db/schema';
import { addFrequency, parseTemplate } from '@/features/plan/logic';

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

/** A recurring bill being logged: saving the entry moves the bill to its next due date. */
export interface RecurringLog {
  ruleId: string;
  name: string;
  dueAt: Date;
  nextDueAt: Date;
  input: TransactionInput;
}

/**
 * What the sheet opens for: listening (optionally with a preferred wallet), editing an entry,
 * or logging a recurring bill from its template.
 */
export type VoiceSheetRequest =
  | { mode: 'listen'; walletId: string | null }
  | { mode: 'edit'; transactionId: string }
  | { mode: 'recurring'; bill: RecurringLog };

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

/** Opens a recurring bill as a filled-in entry to check and save (bills are remind-only). */
export function openRecurringSheet(rule: RecurringRule) {
  const template = parseTemplate(rule.template);
  useVoiceSheet.getState().open({
    mode: 'recurring',
    bill: {
      ruleId: rule.id,
      name: rule.name,
      dueAt: rule.nextDueAt,
      nextDueAt: addFrequency(rule.nextDueAt, rule.frequency),
      input: {
        type: template?.type ?? 'expense',
        amount: template?.amount ?? 0,
        walletId: template?.walletId ?? '',
        toWalletId: null,
        categoryId: template?.categoryId ?? null,
        occurredAt: new Date(),
        note: template?.note ?? rule.name,
        feeAmount: 0,
        tagIds: [],
      },
    },
  });
}
