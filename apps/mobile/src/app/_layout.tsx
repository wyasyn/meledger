import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplash } from '@/components/brand/AnimatedSplash';
import { Text } from '@/components/ui/Text';
import { useDatabaseReady } from '@/db/useDatabaseReady';
import { PermissionSheetHost } from '@/features/permissions/PermissionSheet';
import { useProfile } from '@/features/profile/repo';
import { appFonts } from '@/theme/fonts';
import { lightColors, spacing } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(appFonts);
  const database = useDatabaseReady();
  const ready = (fontsLoaded || fontError !== null) && (database.ready || !!database.error);

  const [splashDone, setSplashDone] = useState(false);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
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
          <PermissionSheetHost />
          {splashDone ? null : <AnimatedSplash onDone={() => setSplashDone(true)} />}
        </BottomSheetModalProvider>
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
        <Stack.Screen name="transaction/new" />
        <Stack.Screen name="transaction/[id]" />
        <Stack.Screen name="wallets/index" />
        <Stack.Screen name="wallets/new" />
        <Stack.Screen name="wallets/[id]" />
      </Stack.Protected>
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      {/* Reachable from both: onboarding's "Try it" step opens it too. */}
      <Stack.Screen
        name="voice"
        options={{ presentation: 'fullScreenModal', animation: 'fade_from_bottom' }}
      />
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
