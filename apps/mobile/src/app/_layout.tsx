import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { interFonts } from '@/theme/fonts';
import { paperTheme } from '@/theme/paperTheme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(interFonts);
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={paperTheme}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }} />
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
