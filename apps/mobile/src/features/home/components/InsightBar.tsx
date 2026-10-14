import { Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

import { Icon } from '@/components/ui/Icon';
import { showSnackbar } from '@/features/feedback/snackbar';
import { lightColors, radius, spacing } from '@/theme/tokens';

/**
 * Black insight pill. Everyone is on the free plan until Pro lands in milestone 6, so it always
 * shows the upsell for now; the paywall it opens arrives with that milestone too.
 */
export function InsightBar() {
  return (
    <Pressable
      onPress={() => showSnackbar({ message: 'MeLedger Pro arrives in milestone 6' })}
      accessibilityRole="button"
      accessibilityLabel="Get insights with Pro"
      style={styles.bar}
    >
      <Icon name="star-four-points" size={20} color={lightColors.primary} />
      <Text variant="labelLarge" style={styles.text}>
        Get insights with Pro
      </Text>
      <Icon name="chevron-right" size={20} color="#A1A1AA" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: lightColors.insightBar,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    // Soft blue glow
    elevation: 6,
    shadowColor: lightColors.primary,
  },
  text: { flex: 1, color: '#FFFFFF' },
});
