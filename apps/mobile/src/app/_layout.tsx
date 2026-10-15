import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplash } from '@/components/brand/AnimatedSplash';
import { Text } from '@/components/ui/Text';
import { useDatabaseReady } from '@/db/useDatabaseReady';
import { registerDevTools } from '@/features/dev/devMenu';
import { PermissionSheetHost } from '@/features/permissions/PermissionSheet';
import { useProfile } from '@/features/profile/repo';
import { VoiceSheetHost } from '@/features/voice/components/VoiceSheet';
import { appFonts } from '@/theme/fonts';
import { lightColors, spacing } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();
registerDevTools();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(appFonts);
  const database = useDatabaseReady();
  const ready = (fontsLoaded || fontError !== null) && (database.ready || !!database.error);

  const [splashDone, setSplashDone] = useState(false);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <BottomSheetModalProvider>
            <StatusBar style="dark" />
            {database.error ? (
              <View style={styles.error}>
                <Text variant="subtitle">Could not open your data</Text>
                <Text variant="body" tone="muted">
                  {database.error.message}
                </Text>
              </View>
            ) : (
              <AppStack />
            )}
            {/* Before the permission host, so its sheet can stack on top of the voice sheet. */}
            <VoiceSheetHost />
            <PermissionSheetHost />
            {splashDone ? null : <AnimatedSplash onDone={() => setSplashDone(true)} />}
          </BottomSheetModalProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Onboarding until it is done, then the app. Only mounted once migrations have run. */
function AppStack() {
  const profile = useProfile();
  // The animated splash covers the screen while the profile loads.
  if (profile === undefined) return null;
  const onboarded = profile?.onboardingDone ?? false;
  return (
    // Keyed so finishing onboarding starts the app fresh on Home instead of keeping old state.
    <Stack key={onboarded ? 'app' : 'onboarding'} screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="wallets/index" />
        <Stack.Screen name="wallets/new" />
        <Stack.Screen name="wallets/[id]" />
        <Stack.Screen name="report/[id]" />
        <Stack.Screen name="goals/index" />
        <Stack.Screen name="goals/new" />
        <Stack.Screen name="goals/[id]" />
        <Stack.Screen name="budgets/index" />
        <Stack.Screen name="budgets/new" />
        <Stack.Screen name="budgets/[id]" />
        <Stack.Screen name="bills/new" />
        <Stack.Screen name="bills/[id]" />
        <Stack.Screen name="debts/index" />
        <Stack.Screen name="debts/new" />
        <Stack.Screen name="debts/[id]/index" />
        <Stack.Screen name="debts/[id]/edit" />
        <Stack.Screen name="groups/new" />
        <Stack.Screen name="groups/archived" />
        <Stack.Screen name="groups/[id]/index" />
        <Stack.Screen name="groups/[id]/edit" />
      </Stack.Protected>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  error: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.sm,
    backgroundColor: lightColors.background,
  },
});
