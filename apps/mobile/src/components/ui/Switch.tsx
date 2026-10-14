import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';

import { lightColors, motion } from '@/theme/tokens';

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}

const W = 52;
const H = 32;
const KNOB = 26;
const OFF_TRACK = '#E4E4E7';

/** iOS-style switch in the brand blue. */
export function Switch({ value, onValueChange, accessibilityLabel, disabled }: SwitchProps) {
  const progress = useDerivedValue(() => withSpring(value ? 1 : 0, motion.pop));
  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.get(), [0, 1], [OFF_TRACK, lightColors.primary]),
  }));
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.get() * (W - KNOB - 6) }],
  }));

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      hitSlop={8}
    >
      <Animated.View style={[styles.track, track, disabled && styles.disabled]}>
        <Animated.View style={[styles.knob, knob]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: W, height: H, borderRadius: H / 2, padding: 3, justifyContent: 'center' },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
  },
  disabled: { opacity: 0.4 },
});
