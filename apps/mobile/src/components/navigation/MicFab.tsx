import * as Haptics from 'expo-haptics';
import { StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { lightColors } from '@/theme/tokens';

interface MicFabProps {
  /** Tap: opens the voice sheet, listening. */
  onPress: () => void;
  /** Press and hold: opens the voice sheet in hold-to-talk mode. */
  onLongPress: () => void;
  /** Release: ends hold-to-talk. */
  onPressOut?: () => void;
}

/** Diameter of the circle; the tab pill beside it matches this height. */
export const MIC_FAB_SIZE = 64;

/** "+" in its own circle next to the tab pill, styled like the pill; opens the voice sheet. */
export function MicFab({ onPress, onLongPress, onPressOut }: MicFabProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel="Add an entry"
      accessibilityHint="Opens MeLedger listening; switch to the keyboard to type. Press and hold to talk while holding"
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
      scaleTo={0.92}
      style={styles.circle}
    >
      <Icon name="plus" weight="bold" size={26} color={lightColors.onSurface} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // Same surface, outline and shadow as the tab pill.
  circle: {
    width: MIC_FAB_SIZE,
    height: MIC_FAB_SIZE,
    borderRadius: MIC_FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: lightColors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: lightColors.outline,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  },
});
