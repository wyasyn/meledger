import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Orb } from '@/features/voice/components/Orb';
import { lightColors } from '@/theme/tokens';

const SIZE = 220;

/**
 * Takes over from the static native splash: the living orb breathes once, then swells and
 * fades to reveal the app underneath.
 */
export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const breath = useSharedValue(0.9);
  const exit = useSharedValue(0);

  useEffect(() => {
    breath.set(
      withSequence(
        withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }),
        withTiming(0.97, { duration: 350, easing: Easing.inOut(Easing.cubic) }),
      ),
    );
    exit.set(
      withDelay(
        850,
        withTiming(1, { duration: 450, easing: Easing.in(Easing.cubic) }, (done) => {
          if (done) scheduleOnRN(onDone);
        }),
      ),
    );
  }, [breath, exit, onDone]);

  const page = useAnimatedStyle(() => ({ opacity: 1 - exit.get() }));
  const orb = useAnimatedStyle(() => ({
    transform: [{ scale: breath.get() + exit.get() * 0.6 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      // The native splash stays up until this first frame is drawn, so there is no flash.
      onLayout={() => SplashScreen.hideAsync()}
      style={[StyleSheet.absoluteFill, styles.page, page]}
    >
      <Animated.View style={orb}>
        <Orb size={SIZE} mode="thinking" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  page: { alignItems: 'center', justifyContent: 'center', backgroundColor: lightColors.background },
});
