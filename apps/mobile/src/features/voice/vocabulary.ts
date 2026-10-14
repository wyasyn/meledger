import type { ParseContext } from '@meledger/shared';
import { and, desc, eq, isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import { created, newId } from '@/db/ids';
import { vocabulary } from '@/db/schema';

import type { Learning } from './logic';

/** Learned words for the parser, most used first. */
export async function loadVocabulary(): Promise<ParseContext['vocabulary']> {
  const rows = await db
    .select({
      phrase: vocabulary.phrase,
      targetType: vocabulary.targetType,
      targetId: vocabulary.targetId,
    })
    .from(vocabulary)
    .where(isNull(vocabulary.deletedAt))
    .orderBy(desc(vocabulary.hits));
  return rows;
}

/**
 * Remembers corrections (build prompt section 6.3): one row per phrase and target type. A
 * phrase corrected again points at the new target; every correction adds a hit.
 */
export async function learn(learnings: readonly Learning[]): Promise<void> {
  for (const l of learnings) {
    const now = new Date();
    const [existing] = await db
      .select()
      .from(vocabulary)
      .where(
        and(
          eq(vocabulary.phrase, l.phrase),
          eq(vocabulary.targetType, l.targetType),
          isNull(vocabulary.deletedAt),
        ),
      );
    if (existing) {
      await db
        .update(vocabulary)
        .set({ targetId: l.targetId, hits: existing.hits + 1, updatedAt: now })
        .where(eq(vocabulary.id, existing.id));
    } else {
      await db.insert(vocabulary).values({ id: newId(), ...created(), ...l, hits: 1 });
    }
  }
}
