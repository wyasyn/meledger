import { Stack } from 'expo-router';

import { lightColors } from '@/theme/tokens';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: lightColors.background },
      }}
    />
  );
}
