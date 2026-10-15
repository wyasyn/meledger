/** Once words have come in, this long without new words ends a tapped session. */
export const PAUSE_MS = 1500;
/** Before any words: a tapped session ends after this long, once the mic has gone quiet. */
export const NO_SPEECH_MS = 8000;
/** Before any words: a tapped session ends after this long even if the mic hears noise. */
export const NO_WORDS_MAX_MS = 15000;
/** A volume event above this (on the -2 to 10 scale) counts as someone speaking. */
export const VOICE_VOLUME = 4;
export const CHECK_EVERY_MS = 250;

export interface Timing {
  startedAt: number;
  /** When the last words arrived (0 before any). */
  wordsAt: number;
  /** When the mic last heard a voice-level sound (0 before any). */
  voiceAt: number;
}

/**
 * Whether a tapped session is over. After words, a pause in words ends it. Before any words, the
 * user may just be about to speak, so it waits until the mic has been quiet for a moment too
 * (with a cap for noisy places, where the mic never goes quiet).
 */
export function shouldAutoStop({ startedAt, wordsAt, voiceAt }: Timing, now: number): boolean {
  if (wordsAt > 0) return now - wordsAt > PAUSE_MS;
  if (now - startedAt > NO_WORDS_MAX_MS) return true;
  return now - startedAt > NO_SPEECH_MS && now - voiceAt > PAUSE_MS;
}
