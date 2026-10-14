import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { Icon } from '@/components/ui/Icon';
import { IconTile } from '@/components/ui/IconTile';
import { Screen } from '@/components/ui/Screen';
import { lightColors, radius, spacing } from '@/theme/tokens';

export default function SettingsScreen() {
  return (
    <Screen title="Settings">
      <Text variant="labelMedium" style={styles.muted}>
        Preferences
      </Text>
      <View style={styles.group}>
        <Pressable
          onPress={() => router.push('/wallets')}
          accessibilityRole="button"
          android_ripple={{ color: lightColors.primaryContainer }}
          style={styles.row}
        >
          <IconTile icon="wallet-outline" color="lime" size={40} />
          <Text variant="bodyLarge" style={styles.flex}>
            Wallets
          </Text>
          <Icon name="chevron-right" size={22} color={lightColors.onSurfaceVariant} />
        </Pressable>
      </View>
      <Text variant="bodyMedium" style={styles.muted}>
        The full settings screen arrives in milestone 5.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: lightColors.onSurfaceVariant },
  group: {
    backgroundColor: lightColors.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  flex: { flex: 1 },
});
