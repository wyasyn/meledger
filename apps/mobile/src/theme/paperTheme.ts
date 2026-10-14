import {
  configureFonts,
  MD3LightTheme,
  type MD3Theme,
  type MD3TypescaleKey,
} from 'react-native-paper';

import { fontFamily } from './fonts';
import { lightColors } from './tokens';

type FontStyle = MD3Theme['fonts']['bodyMedium'];

const type = (family: string, fontSize: number, lineHeight: number): FontStyle => ({
  fontFamily: family,
  fontSize,
  lineHeight,
  fontWeight: 'normal',
  letterSpacing: 0,
});

/**
 * Inter type scale from the build prompt: display balance 36/600, screen title 20/600,
 * card title 16/600, body 14/400, label 12/500. Other variants keep MD3 sizes in Inter.
 */
const typescale: Record<MD3TypescaleKey, FontStyle> = {
  displayLarge: type(fontFamily.semibold, 57, 64),
  displayMedium: type(fontFamily.semibold, 45, 52),
  displaySmall: type(fontFamily.semibold, 36, 44),
  headlineLarge: type(fontFamily.semibold, 32, 40),
  headlineMedium: type(fontFamily.semibold, 28, 36),
  headlineSmall: type(fontFamily.semibold, 24, 32),
  titleLarge: type(fontFamily.semibold, 20, 28),
  titleMedium: type(fontFamily.semibold, 16, 24),
  titleSmall: type(fontFamily.medium, 14, 20),
  bodyLarge: type(fontFamily.regular, 16, 24),
  bodyMedium: type(fontFamily.regular, 14, 20),
  bodySmall: type(fontFamily.regular, 12, 16),
  labelLarge: type(fontFamily.medium, 14, 20),
  labelMedium: type(fontFamily.medium, 12, 16),
  labelSmall: type(fontFamily.medium, 11, 16),
};

export const paperTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: 3, // MD3 multiplies by 4: small elements radius 12
  fonts: configureFonts({ config: typescale }),
  colors: {
    ...MD3LightTheme.colors,
    primary: lightColors.primary,
    onPrimary: lightColors.onPrimary,
    primaryContainer: lightColors.primaryContainer,
    onPrimaryContainer: lightColors.onPrimaryContainer,
    secondaryContainer: lightColors.primaryContainer,
    background: lightColors.background,
    surface: lightColors.surface,
    onSurface: lightColors.onSurface,
    onSurfaceVariant: lightColors.onSurfaceVariant,
    outline: lightColors.outline,
    outlineVariant: lightColors.outline,
    error: lightColors.expense,
    inverseSurface: lightColors.insightBar,
  },
};
