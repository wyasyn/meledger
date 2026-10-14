import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect, useState } from 'react';

import migrations from '../../drizzle/migrations';
import { db } from './client';
import { seedDatabase } from './seed';

/** Runs pending migrations, then first-launch seeding. */
export function useDatabaseReady(): { ready: boolean; error: Error | undefined } {
  const { success, error: migrationError } = useMigrations(db, migrations);
  const [seeded, setSeeded] = useState(false);
  const [seedError, setSeedError] = useState<Error>();

  useEffect(() => {
    if (!success) return;
    Promise.resolve()
      .then(seedDatabase)
      .then(
        () => setSeeded(true),
        (e: unknown) => setSeedError(e instanceof Error ? e : new Error(String(e))),
      );
  }, [success]);

  return { ready: seeded, error: migrationError ?? seedError };
}
