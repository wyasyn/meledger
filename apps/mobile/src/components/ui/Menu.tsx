import { type ReactNode, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { lightColors, motion, radius, shadow, spacing } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface MenuItem<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
  destructive?: boolean;
}

interface MenuProps<T extends string> {
  items: readonly MenuItem<T>[];
  /** Shows a check next to this item. */
  selected?: T;
  onSelect: (value: T) => void;
  /** Renders the trigger; call `open` from its onPress. */
  anchor: (open: () => void) => ReactNode;
  accessibilityLabel?: string;
}

const WIDTH = 232;
const MAX_HEIGHT = 360;
const GAP = 6;

/**
 * Dropdown that springs out of its trigger: soft shadow, rounded 20, check on the current
 * item. Tapping outside closes it. Long lists scroll inside (max 360dp).
 */
export function Menu<T extends string>({
  items,
  selected,
  onSelect,
  anchor,
  accessibilityLabel,
}: MenuProps<T>) {
  // Callback ref kept in state, so `open` (called from the trigger's onPress) can measure it.
  const [trigger, setTrigger] = useState<View | null>(null);
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [frame, setFrame] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const progress = useSharedValue(0);

  const open = () => trigger?.measureInWindow((x, y, w, h) => setFrame({ x, y, w, h }));

  useEffect(() => {
    if (frame) progress.set(withSpring(1, motion.pop));
  }, [frame, progress]);

  const close = (then?: () => void) => {
    progress.set(
      withTiming(0, { duration: motion.fast }, (done) => {
        if (done) scheduleOnRN(finish, then);
      }),
    );
  };
  const finish = (then?: () => void) => {
    setFrame(null);
    then?.();
  };

  // Open below the trigger unless there is no room, aligned to whichever edge is closer.
  const height = Math.min(MAX_HEIGHT, items.length * 52 + spacing.sm * 2);
  const below = frame ? frame.y + frame.h + GAP + height < screenH - 24 : true;
  const alignRight = frame ? frame.x + frame.w / 2 > screenW / 2 : false;
  const position = frame
    ? {
        top: below ? frame.y + frame.h + GAP : frame.y - GAP - height,
        ...(alignRight
          ? { right: Math.max(spacing.lg, screenW - frame.x - frame.w) }
          : { left: Math.max(spacing.lg, frame.x) }),
      }
    : null;

  const popover = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [
      { translateY: (1 - progress.get()) * (below ? -8 : 8) },
      { scale: 0.92 + progress.get() * 0.08 },
    ],
  }));

  return (
    <>
      <View ref={setTrigger} collapsable={false}>
        {anchor(open)}
      </View>
      <Modal
        transparent
        visible={frame !== null}
        onRequestClose={() => close()}
        statusBarTranslucent
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => close()}
          accessibilityLabel="Close menu"
        />
        {position ? (
          <Animated.View
            accessibilityRole="menu"
            accessibilityLabel={accessibilityLabel}
            style={[
              styles.popover,
              position,
              { transformOrigin: `${alignRight ? 'right' : 'left'} ${below ? 'top' : 'bottom'}` },
              popover,
            ]}
          >
            <ScrollView bounces={false} contentContainerStyle={styles.list}>
              {items.map((item) => {
                const isSelected = item.value === selected;
                const color = item.destructive ? lightColors.expense : lightColors.onSurface;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => close(() => onSelect(item.value))}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: isSelected }}
                    style={({ pressed }) => [styles.item, pressed && styles.pressed]}
                  >
                    {item.icon ? <Icon name={item.icon} size={20} color={color} /> : null}
                    <Text
                      variant={isSelected ? 'bodyStrong' : 'body'}
                      color={color}
                      style={styles.flex}
                    >
                      {item.label}
                    </Text>
                    {isSelected ? (
                      <Icon name="check" weight="bold" size={18} color={lightColors.primary} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        ) : null}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  popover: {
    position: 'absolute',
    width: WIDTH,
    maxHeight: MAX_HEIGHT,
    backgroundColor: lightColors.surface,
    borderRadius: radius.card - 4,
    boxShadow: shadow.floating,
    overflow: 'hidden',
  },
  list: { paddingVertical: spacing.sm },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  pressed: { backgroundColor: lightColors.background },
  flex: { flex: 1 },
});
