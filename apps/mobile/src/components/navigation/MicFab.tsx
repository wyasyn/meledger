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

/** Diameter of the mic circle; the tab pill beside it matches this height. */
export const MIC_FAB_SIZE = 64;

export function MicFab({ onPress, onLongPress, onPressOut }: MicFabProps) {
  return (
    <View style={styles.circle}>
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
        <MaterialIcons name="mic" size={28} color={lightColors.surface} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: MIC_FAB_SIZE,
    height: MIC_FAB_SIZE,
    borderRadius: MIC_FAB_SIZE / 2,
    // Near-black like the Budget Buddy mic, at the user's request.
    backgroundColor: lightColors.onSurface,
    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
  },
  // Clips the ripple to the circle; the shadow stays on the unclipped parent.
  fab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: MIC_FAB_SIZE / 2,
    overflow: 'hidden',
  },
});
