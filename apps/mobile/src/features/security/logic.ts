/** Lock delays offered in Settings, in minutes (0 = every time the app opens). */
export const LOCK_DELAYS = [0, 1, 5, 15] as const;

export const lockDelayLabel = (minutes: number) =>
  minutes === 0 ? 'Immediately' : `After ${minutes} min`;

/** Whether coming back after `backgroundAt` should lock, given the delay in minutes. */
export function shouldLock(
  backgroundAt: number | null,
  now: number,
  delayMinutes: number,
): boolean {
  if (backgroundAt === null) return false;
  return now - backgroundAt >= delayMinutes * 60_000;
}
