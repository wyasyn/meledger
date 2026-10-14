import { isNull } from 'drizzle-orm';

import { db } from '@/db/client';
import { type Profile, profile } from '@/db/schema';
import { useLiveData } from '@/db/useLiveData';

const TABLES = ['profile'] as const;

/** The single profile row, kept live. Undefined while loading. */
export function useProfile(): Profile | null | undefined {
  return useLiveData(
    async () =>
      (await db.select().from(profile).where(isNull(profile.deletedAt)).limit(1))[0] ?? null,
    TABLES,
    [],
  );
}

export async function updateProfile(changes: Partial<Omit<Profile, 'id'>>): Promise<void> {
  await db
    .update(profile)
    .set({ ...changes, updatedAt: new Date() })
    .where(isNull(profile.deletedAt));
}
