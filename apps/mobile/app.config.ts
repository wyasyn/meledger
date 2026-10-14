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
      backgroundColor: '#EDE7FE',
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
        backgroundColor: '#0067EE',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
