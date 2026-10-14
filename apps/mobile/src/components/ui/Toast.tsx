import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { Easing, FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { useSnackbar } from '@/features/feedback/snackbar';
import { lightColors, motion, radius, shadow, spacing } from '@/theme/tokens';

import { Text } from './Text';

/**
 * The app-wide message pill (store: features/feedback/snackbar). A dark pill that slides up,
 * with an optional action such as Undo, and dismisses itself after its duration.
 */
export function Toast({ bottom }: { bottom: number }) {
  const current = useSnackbar((s) => s.current);
  const dismiss = useSnackbar((s) => s.dismiss);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(dismiss, current.duration ?? 3000);
    return () => clearTimeout(timer);
  }, [current, dismiss]);

  if (!current) return null;
  return (
    <Animated.View
      key={current.key}
      // A short eased rise (about 25dp) with a fade: no spring, so it never overshoots.
      entering={FadeInDown.duration(motion.slow).easing(Easing.out(Easing.cubic))}
      exiting={FadeOutDown.duration(motion.base).easing(Easing.in(Easing.cubic))}
      accessibilityLiveRegion="polite"
      style={[styles.toast, { bottom }]}
    >
      <Text variant="label" tone="inverse" style={styles.message}>
        {current.message}
      </Text>
      {current.action ? (
        <Pressable
          onPress={() => {
            current.action?.onPress();
            dismiss();
          }}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text variant="label" color="#7DB6FF">
            {current.action.label}
          </Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.gutter,
    right: spacing.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: lightColors.insightBar,
    boxShadow: shadow.floating,
  },
  message: { flex: 1 },
});
