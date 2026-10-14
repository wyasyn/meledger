import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'MeLedger',
  slug: 'meledger',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'meledger',
  userInterfaceStyle: 'light',
  platforms: ['android'],
  android: {
    package: 'com.yasinwalum.meledger',
    adaptiveIcon: {
      backgroundColor: '#0A5FE0',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    // Microphone and speech recognition. No recording options are ever enabled: audio is never stored.
    'expo-speech-recognition',
    'expo-notifications',
    'expo-local-authentication',
    [
      'expo-splash-screen',
      {
        // Light page with the living orb; AnimatedSplash takes over from this static frame.
        backgroundColor: '#F4F4F5',
        image: './assets/images/splash-icon.png',
        imageWidth: 220,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
