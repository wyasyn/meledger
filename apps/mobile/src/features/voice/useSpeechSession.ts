import {
  ExpoSpeechRecognitionModule,
  type ExpoSpeechRecognitionOptions,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';

export type SpeechStatus = 'idle' | 'starting' | 'listening' | 'done' | 'error';

export interface SpeechError {
  code: string;
  message: string;
}

/** Volume events run from -2 (silence) to 10; anything at or below 0 is inaudible. */
const toLevel = (value: number) => Math.min(1, Math.max(0, value / 8));

const baseOptions = (onDevice: boolean): ExpoSpeechRecognitionOptions => ({
  lang: 'en-US',
  interimResults: true,
  // Keeps listening through pauses (Android 13+); older versions stop after silence.
  continuous: true,
  addsPunctuation: true,
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
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<SpeechError | null>(null);
  const level = useSharedValue(0);
  // Whether this attempt runs on-device and whether any result arrived, for the fallback.
  const attempt = useRef({ onDevice: false, heard: false });

  useSpeechRecognitionEvent('start', () => setStatus('listening'));
  useSpeechRecognitionEvent('end', () => {
    level.set(0);
    setStatus((s) => (s === 'error' || s === 'starting' ? s : 'done'));
  });
  useSpeechRecognitionEvent('volumechange', (e) => level.set(toLevel(e.value)));
  useSpeechRecognitionEvent('result', (e) => {
    attempt.current.heard = true;
    const text = e.results[0]?.transcript ?? '';
    if (e.isFinal) {
      setFinalText((prev) => [prev, text].filter(Boolean).join(' '));
      setInterim('');
    } else {
      setInterim(text);
    }
  });
  useSpeechRecognitionEvent('error', (e) => {
    level.set(0);
    const unsupported = e.error === 'language-not-supported' || e.error === 'service-not-allowed';
    if (unsupported && attempt.current.onDevice && !attempt.current.heard) {
      // No offline model for this language: try again with the system recognizer.
      attempt.current = { onDevice: false, heard: false };
      setStatus('starting');
      ExpoSpeechRecognitionModule.start(baseOptions(false));
      return;
    }
    if (e.error === 'aborted') return;
    // "No speech" just means the user said nothing; treat it as an empty finished session.
    if (e.error === 'no-speech' || e.error === 'speech-timeout') {
      setStatus('done');
      return;
    }
    setError({ code: e.error, message: e.message });
    setStatus('error');
  });

  const start = useCallback(async (): Promise<'started' | 'denied' | 'unavailable'> => {
    const permission = await ExpoSpeechRecognitionModule.getPermissionsAsync();
    if (!permission.granted) return 'denied';
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) return 'unavailable';
    const onDevice = ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();
    attempt.current = { onDevice, heard: false };
    setFinalText('');
    setInterim('');
    setError(null);
    setStatus('starting');
    ExpoSpeechRecognitionModule.start(baseOptions(onDevice));
    return 'started';
  }, []);

  const stop = useCallback(() => ExpoSpeechRecognitionModule.stop(), []);

  // Leaving the screen ends the session without delivering a result.
  useEffect(() => () => ExpoSpeechRecognitionModule.abort(), []);

  const transcript = [finalText, interim].filter(Boolean).join(' ');
  return { status, transcript, level, error, start, stop };
}

/** Whether the microphone permission is granted, without prompting. */
export async function hasMicrophonePermission(): Promise<boolean> {
  return (await ExpoSpeechRecognitionModule.getPermissionsAsync()).granted;
}

/** Only called from onboarding (project rule: no permission prompts anywhere else). */
export async function requestMicrophonePermission(): Promise<boolean> {
  return (await ExpoSpeechRecognitionModule.requestPermissionsAsync()).granted;
}
