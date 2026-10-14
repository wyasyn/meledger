import { useEffect } from 'react';
import type { DimensionValue } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { radius } from '@/theme/tokens';

/** Grey placeholder block that gently pulses while content loads. */
export function Skeleton({
  width = '100%',
  height = 16,
  rounded = radius.small,
}: {
  width?: DimensionValue;
  height?: number;
  rounded?: number;
}) {
  const pulse = useSharedValue(0.5);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1, { duration: 900 }), -1, true));
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ opacity: pulse.get() }));
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: rounded, backgroundColor: '#E4E4E7' }, style]}
    />
  );
}
