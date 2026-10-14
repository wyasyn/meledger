import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { PermissionSheetHost } from '@/features/permissions/PermissionSheet';
import { useDatabaseReady } from '@/db/useDatabaseReady';
import { appFonts } from '@/theme/fonts';
import { lightColors, spacing } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(appFonts);
  const database = useDatabaseReady();
  const ready = (fontsLoaded || fontError !== null) && (database.ready || !!database.error);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

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
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen
                name="voice"
                options={{ presentation: 'fullScreenModal', animation: 'fade_from_bottom' }}
              />
            </Stack>
          )}
          <PermissionSheetHost />
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
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
