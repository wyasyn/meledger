import { describe, expect, it } from 'vitest';

import { NO_SPEECH_MS, NO_WORDS_MAX_MS, PAUSE_MS, shouldAutoStop } from './autoStop';

const start = 100_000;
const at = (ms: number) => start + ms;

describe('shouldAutoStop', () => {
  it('keeps listening while nothing has been said yet', () => {
    expect(shouldAutoStop({ startedAt: start, wordsAt: 0, voiceAt: 0 }, at(5000))).toBe(false);
  });

  it('stops when nothing is said and the mic stays quiet', () => {
    expect(shouldAutoStop({ startedAt: start, wordsAt: 0, voiceAt: 0 }, at(NO_SPEECH_MS + 1))).toBe(
      true,
    );
  });

  it('keeps listening when the user starts speaking just before the timeout', () => {
    // Voice heard, but no words transcribed yet.
    const voiceAt = at(NO_SPEECH_MS - 200);
    expect(shouldAutoStop({ startedAt: start, wordsAt: 0, voiceAt }, at(NO_SPEECH_MS + 500))).toBe(
      false,
    );
  });

  it('stops in a noisy place where no words ever come', () => {
    const now = at(NO_WORDS_MAX_MS + 1);
    expect(shouldAutoStop({ startedAt: start, wordsAt: 0, voiceAt: now }, now)).toBe(true);
  });

  it('stops after a pause in words, not before', () => {
    const wordsAt = at(3000);
    expect(
      shouldAutoStop({ startedAt: start, wordsAt, voiceAt: 0 }, wordsAt + PAUSE_MS - 100),
    ).toBe(false);
    expect(shouldAutoStop({ startedAt: start, wordsAt, voiceAt: 0 }, wordsAt + PAUSE_MS + 1)).toBe(
      true,
    );
  });
});
