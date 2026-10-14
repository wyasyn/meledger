import { randomUUID } from 'expo-crypto';

export const newId = () => randomUUID();

/** Timestamps for a new row. */
export const created = () => {
  const now = new Date();
  return { createdAt: now, updatedAt: now };
};
