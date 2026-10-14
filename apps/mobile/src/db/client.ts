import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

/** Change events power useLiveData. */
export const sqlite = openDatabaseSync('meledger.db', { enableChangeListener: true });

export const db = drizzle(sqlite, { schema });

export type Db = typeof db;
