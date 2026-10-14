import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider, Text } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useDatabaseReady } from '@/db/useDatabaseReady';
import { interFonts } from '@/theme/fonts';
import { paperTheme } from '@/theme/paperTheme';
import { lightColors, spacing } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(interFonts);
  const database = useDatabaseReady();
  const ready = (fontsLoaded || fontError !== null) && (database.ready || !!database.error);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme}>
          <BottomSheetModalProvider>
            <StatusBar style="dark" />
            {database.error ? (
              <View style={styles.error}>
                <Text variant="titleMedium">Could not open your data</Text>
                <Text variant="bodyMedium" style={styles.muted}>
                  {database.error.message}
                </Text>
              </View>
            ) : (
              <Stack screenOptions={{ headerShown: false }} />
            )}
          </BottomSheetModalProvider>
        </PaperProvider>
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
  muted: { color: lightColors.onSurfaceVariant },
});
