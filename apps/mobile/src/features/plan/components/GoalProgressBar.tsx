import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';

import { lightColors, motion, radius, tint } from '@/theme/tokens';

interface GoalProgressBarProps {
  /** 0 to 1. */
  value: number;
  /** Where the bar should be by now (0 to 1); the gap up to it is hatched. */
  expected: number | null;
  color: string;
}

const HEIGHT = 10;
const THUMB = 18;

/**
 * Goal progress (the goal card inspiration): a filled bar with a round thumb at the current
 * value, and a hatched segment from there to where the goal should be by now.
 */
export function GoalProgressBar({ value, expected, color }: GoalProgressBarProps) {
  const [width, setWidth] = useState(0);
  const v = Math.min(1, Math.max(0, value));
  const e = expected === null ? null : Math.min(1, Math.max(0, expected));
  const hatch = e !== null && e > v ? { left: v * width, width: (e - v) * width } : null;

  const fill = useAnimatedStyle(() => ({
    width: withTiming(v * width, { duration: motion.slow }),
  }));
  const thumb = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: withTiming(Math.min(width - THUMB, Math.max(0, v * width - THUMB / 2)), {
          duration: motion.slow,
        }),
      },
    ],
  }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
      onLayout={(ev) => setWidth(ev.nativeEvent.layout.width)}
      style={styles.wrap}
    >
      <View style={[styles.track, { backgroundColor: tint(color, 0.12) }]}>
        {hatch && hatch.width > 1 ? (
          <Svg style={[styles.hatch, { left: hatch.left, width: hatch.width }]}>
            <Defs>
              <Pattern
                id="hatch"
                patternUnits="userSpaceOnUse"
                width={5}
                height={5}
                patternTransform="rotate(45)"
              >
                <Line x1={0} y1={0} x2={0} y2={5} stroke={tint(color, 0.55)} strokeWidth={2} />
              </Pattern>
            </Defs>
            <Rect x={0} y={0} width="100%" height="100%" fill="url(#hatch)" />
          </Svg>
        ) : null}
        <Animated.View style={[styles.fill, { backgroundColor: color }, fill]} />
      </View>
      {width > 0 ? <Animated.View style={[styles.thumb, { borderColor: color }, thumb]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: THUMB, justifyContent: 'center' },
  track: { height: HEIGHT, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: radius.pill },
  hatch: { position: 'absolute', top: 0, bottom: 0, height: HEIGHT },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    backgroundColor: lightColors.surface,
    boxShadow: '0 1px 4px rgba(17,17,17,0.18)',
  },
});
