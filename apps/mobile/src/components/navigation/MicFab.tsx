import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { lightColors } from '@/theme/tokens';

interface MicFabProps {
  /** Tap: opens the voice sheet in tap-to-talk mode (milestone 3). */
  onPress: () => void;
  /** Press and hold: starts recording (milestone 3). */
  onLongPress: () => void;
  /** Release after a hold: stops recording and parses (milestone 3). */
  onPressOut?: () => void;
}

const SIZE = 60;

export function MicFab({ onPress, onLongPress, onPressOut }: MicFabProps) {
  return (
    <View style={styles.glow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log by voice"
        accessibilityHint="Tap to open voice entry, or press and hold to talk"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onLongPress();
        }}
        onPressOut={onPressOut}
        delayLongPress={300}
        android_ripple={{ color: 'rgba(255,255,255,0.3)', borderless: false }}
        style={styles.fab}
      >
        <MaterialIcons name="mic" size={28} color={lightColors.onPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: {
    marginTop: -SIZE / 2 - 12,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: lightColors.primary,
    elevation: 10,
    shadowColor: lightColors.primary,
    borderWidth: 4,
    borderColor: lightColors.primaryContainer,
    overflow: 'hidden',
  },
  fab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
