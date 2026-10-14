import { CATEGORY_COLORS, type CategoryColor } from '@meledger/shared';
import { count, isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import { created, newId } from '@/db/ids';
import { tags } from '@/db/schema';

const TAG_COLORS = Object.keys(CATEGORY_COLORS) as CategoryColor[];

/** Returns the id of the tag with this name (case-insensitive), creating it if needed. */
export async function findOrCreateTag(name: string): Promise<string> {
  const trimmed = name.trim();
  const existing = await db.select().from(tags).where(isNull(tags.deletedAt));
  const match = existing.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
  if (match) return match.id;
  const [{ value }] = await db.select({ value: count() }).from(tags);
  const id = newId();
  await db
    .insert(tags)
    .values({ id, ...created(), name: trimmed, color: TAG_COLORS[value % TAG_COLORS.length] });
  return id;
}
