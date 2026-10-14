import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown } from 'react-native-reanimated';

import { IconTile } from '@/components/ui/IconTile';
import { Text } from '@/components/ui/Text';
import { lightColors, radius, shadow, spacing } from '@/theme/tokens';

const LINE = '“Lunch 12k, cash”';
const STEP_MS = 70;

/** A spoken line types itself out, then turns into the entry it creates. */
export function SpokenLineDemo() {
  const [shown, setShown] = useState(0);
  const done = shown >= LINE.length;

  useEffect(() => {
    if (done) return;
    const timer = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 500 : STEP_MS);
    return () => clearTimeout(timer);
  }, [shown, done]);

  return (
    <View style={styles.root} accessible accessibilityLabel="Say lunch 12k cash, and it is logged">
      <Text variant="title" align="center" color={lightColors.primary} style={styles.line}>
        {LINE.slice(0, shown)}
      </Text>
      {done ? (
        <Animated.View
          entering={FadeInDown.delay(250).duration(500).easing(Easing.out(Easing.cubic))}
          style={styles.card}
        >
          <IconTile icon="eating-out" color="orange" />
          <View style={styles.flex}>
            <Text variant="subtitle">Lunch</Text>
            <Text variant="small" tone="muted">
              Cash · Today
            </Text>
          </View>
          <Animated.View entering={FadeIn.delay(600).duration(400)}>
            <Text variant="bodyStrong" tone="expense">
              -12,000
            </Text>
          </Animated.View>
        </Animated.View>
      ) : (
        <View style={styles.cardSpace} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg, alignSelf: 'stretch' },
  line: { minHeight: 26 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card - 4,
    backgroundColor: lightColors.surface,
    boxShadow: shadow.raised,
  },
  cardSpace: { height: 76 },
  flex: { flex: 1, gap: 2 },
});
