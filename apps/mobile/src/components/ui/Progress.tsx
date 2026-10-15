import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { lightColors, motion, radius, tint } from '@/theme/tokens';

import { Text } from './Text';

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/** Rounded progress bar; the track is the colour at 12%. */
export function ProgressBar({
  value,
  color = lightColors.primary,
  height = 8,
}: {
  /** 0 to 1. */
  value: number;
  color?: string;
  height?: number;
}) {
  // Worked out on the JS side: worklets can't call plain functions like clamp.
  const pct = `${clamp(value) * 100}%` as const;
  const fill = useAnimatedStyle(() => ({
    width: withTiming(pct, { duration: motion.slow }),
  }));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamp(value) * 100) }}
      style={[styles.track, { height, backgroundColor: tint(color, 0.12) }]}
    >
      <Animated.View style={[styles.fill, { backgroundColor: color }, fill]} />
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Ring with the percentage in the middle (Paylix budgets). */
export function ProgressRing({
  value,
  size = 48,
  stroke = 5,
  color = lightColors.primary,
  showLabel = true,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  showLabel?: boolean;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - clamp(value));
  const pct = Math.round(clamp(value) * 100);
  const props = useAnimatedProps(() => ({
    strokeDashoffset: withTiming(offset, { duration: motion.slow }),
  }));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} style={styles.rotate}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tint(color, 0.14)}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          // A round cap draws a dot even at zero length, so an empty ring shows no arc at all.
          strokeLinecap={pct > 0 ? 'round' : 'butt'}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={props}
        />
      </Svg>
      {showLabel ? (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text variant="micro" color={color}>
            {pct}%
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Small pill label ("Pro", "Beta", "+12%"). */
export function Badge({ label, color = lightColors.primary }: { label: string; color?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: tint(color, 0.12) }]}>
      <Text variant="micro" color={color}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  rotate: { transform: [{ rotate: '-90deg' }] },
  center: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
});
