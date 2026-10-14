import { Stack } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Toast } from '@/components/ui/Toast';
import { lightColors } from '@/theme/tokens';

/** Height of a step's bottom block (page dots, Continue, Skip) above the safe area. */
const STEP_FOOTER = 150;

export default function OnboardingLayout() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: lightColors.background },
        }}
      />
      {/* The tab bar hosts the snackbar in the app; here it sits above the Continue button,
          so "Try it" shows "Saved 1 entry · Undo". */}
      <Toast bottom={insets.bottom + STEP_FOOTER} />
    </View>
  );
}
