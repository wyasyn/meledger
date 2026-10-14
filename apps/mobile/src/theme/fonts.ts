import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';

/** Passed to useFonts. Android needs one family per weight. */
export const interFonts = { Inter_400Regular, Inter_500Medium, Inter_600SemiBold };

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
} as const;
