import { registerDevMenuItems } from 'expo-dev-menu';

import { showSnackbar } from '@/features/feedback/snackbar';

import { addSampleData, removeSampleData } from './sampleData';

/**
 * Development builds only: extra entries in the Expo dev menu (shake the phone or press "m" in
 * Metro). Release builds never call this.
 */
export function registerDevTools(): void {
  if (!__DEV__) return;
  void registerDevMenuItems([
    {
      name: 'MeLedger: add sample entries',
      shouldCollapse: true,
      callback: () => {
        addSampleData().then(
          (count) => showSnackbar({ message: `Added ${count} sample entries` }),
          (e: unknown) => showSnackbar({ message: `Sample entries failed: ${String(e)}` }),
        );
      },
    },
    {
      name: 'MeLedger: remove sample entries',
      shouldCollapse: true,
      callback: () => {
        removeSampleData().then(() => showSnackbar({ message: 'Sample entries removed' }));
      },
    },
  ]);
}
