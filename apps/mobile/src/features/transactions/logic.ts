import { walletDeltas, type LedgerTransaction } from '@meledger/shared';
import { format, startOfDay } from 'date-fns';

export interface DaySection<T> {
  key: string;
  /** e.g. "Monday, 12 October 2026" */
  title: string;
  /** Net change across the shown entries: income minus spending (transfer fees count). */
  total: number;
  data: T[];
}

/** Net effect of one entry on the user's total money (transfers only cost their fee). */
export function netEffect(tx: LedgerTransaction): number {
  return walletDeltas(tx).reduce((sum, [, delta]) => sum + delta, 0);
}

/** Groups entries (already sorted newest first) by local calendar day. */
export function groupByDay<T extends LedgerTransaction>(sorted: readonly T[]): DaySection<T>[] {
  const sections: DaySection<T>[] = [];
  for (const tx of sorted) {
    const day = startOfDay(tx.occurredAt);
    const key = format(day, 'yyyy-MM-dd');
    let section = sections.at(-1);
    if (section?.key !== key) {
      section = { key, title: format(day, 'EEEE, d MMMM yyyy'), total: 0, data: [] };
      sections.push(section);
    }
    section.total += netEffect(tx);
    section.data.push(tx);
  }
  return sections;
}

/** Digits typed into an amount field as integer minor units (UGX has no decimals). */
export function parseAmountInput(text: string): number {
  const digits = text.replace(/\D/g, '').slice(0, 12);
  return digits ? Number.parseInt(digits, 10) : 0;
}
