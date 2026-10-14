import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

import type { IconName } from '@/components/ui/IconTile';
import type { Wallet } from '@/db/schema';
import { lightColors, paletteColor, radius, spacing } from '@/theme/tokens';

import { useHomeStore } from '../store';

/** Horizontal wallet chips; tapping one filters the transaction list. */
export function WalletStrip({ wallets }: { wallets: Wallet[] }) {
  const selected = useHomeStore((s) => s.walletId);
  const setWalletId = useHomeStore((s) => s.setWalletId);
  const active = wallets.filter((w) => !w.archived);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
      style={styles.bleed}
    >
      <StripChip label="All" selected={selected === null} onPress={() => setWalletId(null)} />
      {active.map((wallet) => (
        <StripChip
          key={wallet.id}
          label={wallet.name}
          icon={wallet.icon}
          color={paletteColor(wallet.color)}
          selected={selected === wallet.id}
          onPress={() => setWalletId(selected === wallet.id ? null : wallet.id)}
        />
      ))}
      <StripChip label="Wallets" icon="pencil-outline" onPress={() => router.push('/wallets')} />
    </ScrollView>
  );
}

interface StripChipProps {
  label: string;
  icon?: string;
  color?: string;
  selected?: boolean;
  onPress: () => void;
}

function StripChip({ label, icon, color, selected = false, onPress }: StripChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {icon ? (
        <MaterialCommunityIcons
          name={icon as IconName}
          size={16}
          color={color ?? lightColors.onSurfaceVariant}
        />
      ) : null}
      <Text variant="labelLarge" style={selected ? styles.labelSelected : undefined}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -spacing.lg },
  strip: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: lightColors.outline,
    backgroundColor: lightColors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipSelected: {
    backgroundColor: lightColors.primaryContainer,
    borderColor: lightColors.primaryContainer,
  },
  labelSelected: { color: lightColors.onPrimaryContainer },
});
