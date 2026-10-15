import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionOptions,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { SPEECH_HINTS } from '@meledger/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';

import { CHECK_EVERY_MS, shouldAutoStop, type Timing, VOICE_VOLUME } from './autoStop';

export type SpeechStatus = 'idle' | 'starting' | 'listening' | 'done' | 'error';

export interface SpeechError {
  code: string;
  message: string;
}

/** Volume events run from -2 (silence) to 10; anything at or below 0 is inaudible. */
const toLevel = (value: number) => Math.min(1, Math.max(0, value / 8));

/**
 * The recognizer always runs in continuous mode, which never ends on its own (a 10 minute
 * silence timeout below Android 13, a segmented session from 13 on). The app decides when a
 * tapped session is over (see `shouldAutoStop`): the recognizers' own end-of-speech timing was too
 * eager, ending before the user had started speaking.
 */
const baseOptions = (onDevice: boolean): ExpoSpeechRecognitionOptions => ({
  lang: 'en-US',
  interimResults: true,
  continuous: true,
  addsPunctuation: true,
  // Several guesses per phrase; the parser picks the one it understands (pickTranscript).
  maxAlternatives: 5,
  // Local words to listen for (Android 13+).
  contextualStrings: [...SPEECH_HINTS],
  requiresOnDeviceRecognition: onDevice,
  volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
  // No recordingOptions: audio is never written to disk.
});

/**
 * One speech-to-text session for the voice screen. Prefers on-device recognition; if the
 * device has no offline model it retries once with the system recognizer. Never asks for the
 * microphone permission (that only happens in onboarding): `start` reports "denied" instead,
 * so the caller can show the explanation sheet.
 */
export function useSpeechSession() {
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [finalText, setFinalText] = useState('');
  // The recognizer's alternatives for each finished phrase, most likely first.
  const [segments, setSegments] = useState<string[][]>([]);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<SpeechError | null>(null);
  const level = useSharedValue(0);
  // Whether this attempt runs on-device and whether any result arrived, for the fallback, and
  // whether it ends by itself after a pause.
  const attempt = useRef({ onDevice: false, heard: false, autoStop: true });
  const timing = useRef<Timing>({ startedAt: 0, wordsAt: 0, voiceAt: 0 });
  const autoStopCheck = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAutoStop = useCallback(() => {
    if (autoStopCheck.current) clearInterval(autoStopCheck.current);
    autoStopCheck.current = null;
  }, []);

  useSpeechRecognitionEvent('start', () => {
    setStatus('listening');
    clearAutoStop();
    timing.current = { startedAt: Date.now(), wordsAt: 0, voiceAt: 0 };
    if (!attempt.current.autoStop) return;
    autoStopCheck.current = setInterval(() => {
      if (!shouldAutoStop(timing.current, Date.now())) return;
      clearAutoStop();
      ExpoSpeechRecognitionModule.stop();
    }, CHECK_EVERY_MS);
  });
  useSpeechRecognitionEvent('end', () => {
    clearAutoStop();
    level.set(0);
    // Only a session that was listening finishes. After cancel() (closing, typing instead) the
    // recognizer still reports its end; that must not mark the old words as a new result.
    setStatus((s) => (s === 'listening' ? 'done' : s));
  });
  useSpeechRecognitionEvent('volumechange', (e) => {
    level.set(toLevel(e.value));
    if (e.value > VOICE_VOLUME) timing.current.voiceAt = Date.now();
  });
  useSpeechRecognitionEvent('result', (e) => {
    attempt.current.heard = true;
    const text = e.results[0]?.transcript ?? '';
    if (text.trim()) timing.current.wordsAt = Date.now();
    if (e.isFinal) {
      const alternatives = e.results.map((r) => r.transcript).filter(Boolean);
      setSegments((prev) => [...prev, alternatives]);
      setFinalText((prev) => [prev, text].filter(Boolean).join(' '));
      setInterim('');
    } else {
      setInterim(text);
    }
  });
  useSpeechRecognitionEvent('error', (e) => {
    clearAutoStop();
    level.set(0);
    const unsupported = e.error === 'language-not-supported' || e.error === 'service-not-allowed';
    if (unsupported && attempt.current.onDevice && !attempt.current.heard) {
      // No offline model for this language: try again with the system recognizer.
      attempt.current = { ...attempt.current, onDevice: false, heard: false };
      setStatus('starting');
      ExpoSpeechRecognitionModule.start(baseOptions(false));
      return;
    }
    if (e.error === 'aborted') return;
    // "No speech" just means the user said nothing; treat it as an empty finished session.
    if (e.error === 'no-speech' || e.error === 'speech-timeout') {
      setStatus((s) => (s === 'idle' ? s : 'done'));
      return;
    }
    setError({ code: e.error, message: e.message });
    setStatus('error');
  });

  /**
   * Starts listening. A tapped session ends after a pause; `untilStopped` (hold-to-talk) listens
   * until stop().
   */
  const start = useCallback(
    async (untilStopped = false): Promise<'started' | 'denied' | 'unavailable'> => {
      const permission = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      if (!permission.granted) return 'denied';
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) return 'unavailable';
      const onDevice = ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();
      attempt.current = { onDevice, heard: false, autoStop: !untilStopped };
      setFinalText('');
      setSegments([]);
      setInterim('');
      setError(null);
      setStatus('starting');
      ExpoSpeechRecognitionModule.start(baseOptions(onDevice));
      return 'started';
    },
    [],
  );

  const stop = useCallback(() => ExpoSpeechRecognitionModule.stop(), []);

  /** Ends the session right away without a result (closing, switching to typing). */
  const cancel = useCallback(() => {
    clearAutoStop();
    ExpoSpeechRecognitionModule.abort();
    level.set(0);
    setStatus('idle');
  }, [level, clearAutoStop]);

  /** Development only: finishes a session as if `text` had been spoken (no microphone). */
  const simulate = useCallback((text: string) => {
    setTimeout(() => {
      setError(null);
      setInterim('');
      setFinalText(text);
      setSegments([[text]]);
      setStatus('done');
    }, 300);
  }, []);

  // Leaving the screen ends the session without delivering a result.
  useEffect(
    () => () => {
      clearAutoStop();
      ExpoSpeechRecognitionModule.abort();
    },
    [clearAutoStop],
  );

  const transcript = [finalText, interim].filter(Boolean).join(' ');
  return { status, transcript, segments, level, error, start, stop, cancel, simulate };
}

/** Whether the microphone permission is granted, without prompting. */
export async function hasMicrophonePermission(): Promise<boolean> {
  return (await ExpoSpeechRecognitionModule.getPermissionsAsync()).granted;
}

/** Only called from onboarding (project rule: no permission prompts anywhere else). */
export async function requestMicrophonePermission(): Promise<boolean> {
  return (await ExpoSpeechRecognitionModule.requestPermissionsAsync()).granted;
}
