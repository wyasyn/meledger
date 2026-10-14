import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { showSnackbar } from '@/features/feedback/snackbar';
import { lightColors, radius, spacing, tint } from '@/theme/tokens';

/**
 * Black insight pill. Everyone is on the free plan until Pro lands in milestone 6, so it always
 * shows the upsell for now; the paywall it opens arrives with that milestone too.
 */
export function InsightBar() {
  return (
    <PressableScale
      onPress={() => showSnackbar({ message: 'MeLedger Pro arrives in milestone 6' })}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel="Get insights with Pro"
      style={styles.bar}
    >
      <View style={styles.spark}>
        <Icon name="sparkle" weight="fill" size={18} color={lightColors.primary} />
      </View>
      <Text variant="label" tone="inverse" style={styles.text}>
        Get insights with Pro
      </Text>
      <Text variant="label" color="#A1A1AA">
        Get Pro
      </Text>
      <Icon name="chevron-right" size={16} color="#A1A1AA" />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: lightColors.insightBar,
    borderRadius: radius.pill,
    paddingLeft: spacing.sm,
    paddingRight: spacing.lg,
    height: 56,
    // Soft blue glow
    boxShadow: `0 8px 24px ${tint(lightColors.primary, 0.28)}`,
  },
  spark: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  text: { flex: 1 },
});
