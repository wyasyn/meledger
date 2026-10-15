import { registerDevMenuItems } from 'expo-dev-menu';

import { showSnackbar } from '@/features/feedback/snackbar';
import { simulateVoice } from '@/features/voice/store';

import { addSampleData, removeSampleData } from './sampleData';

/** Lines the voice sheet can take as if spoken (emulators have no microphone). */
const VOICE_TESTS = [
  'paid boda 5k and lunch 12k cash',
  'paid sacco 50k',
  'set food budget 300k',
  'new goal laptop 2 million by December',
];

/**
 * Development builds only: extra entries in the Expo dev menu (shake the phone or press "m" in
 * Metro). Release builds never call this.
 */
export function registerDevTools(): void {
  if (!__DEV__) return;
  void registerDevMenuItems([
    {
      name: 'MeLedger: add sample entries and plan',
      shouldCollapse: true,
      callback: () => {
        addSampleData().then(
          (count) => showSnackbar({ message: `Added ${count} sample entries and a sample plan` }),
          (e: unknown) => showSnackbar({ message: `Sample entries failed: ${String(e)}` }),
        );
      },
    },
    {
      name: 'MeLedger: remove sample entries and plan',
      shouldCollapse: true,
      callback: () => {
        removeSampleData().then(() => showSnackbar({ message: 'Sample entries and plan removed' }));
      },
    },
    ...VOICE_TESTS.map((text) => ({
      name: `MeLedger voice: "${text}"`,
      shouldCollapse: true,
      callback: () => simulateVoice(text),
    })),
  ]);
}
