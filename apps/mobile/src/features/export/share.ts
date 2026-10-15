import { format } from 'date-fns';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { LedgerData } from '@/features/transactions/useLedgerData';

import { buildCsv } from './csv';

/**
 * Writes every entry to a CSV in the app's cache and opens Android's share sheet (WhatsApp,
 * Gmail, Drive, Files). Returns false when the phone cannot share files.
 */
export async function shareEntriesCsv(data: LedgerData, now: Date): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  const tagNames = new Map(data.tags.map((t) => [t.id, t.name]));
  const csv = buildCsv(data.transactions, {
    wallets: new Map(data.wallets.map((w) => [w.id, w.name])),
    categories: new Map(data.categories.map((c) => [c.id, c.name])),
    tags: (id) => (data.tagIdsByTransaction.get(id) ?? []).flatMap((t) => tagNames.get(t) ?? []),
  });
  const file = new File(Paths.cache, `meledger-${format(now, 'yyyy-MM-dd')}.csv`);
  if (file.exists) file.delete();
  file.create();
  file.write(csv);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export MeLedger entries',
  });
  return true;
}
