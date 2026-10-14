import { BottomSheetView } from '@gorhom/bottom-sheet';
import type { Ref } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { IconTile } from '@/components/ui/IconTile';
import { Sheet, type SheetRef } from '@/components/ui/Sheet';
import type { Wallet } from '@/db/schema';
import { lightColors, spacing } from '@/theme/tokens';

interface WalletPickerSheetProps {
  ref: Ref<SheetRef>;
  title: string;
  wallets: Wallet[];
  selectedId: string | null;
  mainId: string | null;
  onSelect: (id: string) => void;
}

export function WalletPickerSheet({
  ref,
  title,
  wallets,
  selectedId,
  mainId,
  onSelect,
}: WalletPickerSheetProps) {
  return (
    <Sheet ref={ref} title={title}>
      <BottomSheetView style={styles.list}>
        {wallets
          .filter((w) => !w.archived || w.id === selectedId)
          .map((wallet) => (
            <Pressable
              key={wallet.id}
              onPress={() => onSelect(wallet.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: wallet.id === selectedId }}
              android_ripple={{ color: lightColors.primaryContainer }}
              style={styles.row}
            >
              <IconTile icon={wallet.icon} color={wallet.color} />
              <View style={styles.text}>
                <Text variant="titleMedium">{wallet.name}</Text>
                {wallet.id === mainId ? (
                  <Text variant="bodySmall" style={styles.muted}>
                    Main wallet
                  </Text>
                ) : null}
              </View>
              {wallet.id === selectedId ? (
                <Icon source="check" size={22} color={lightColors.primary} />
              ) : null}
            </Pressable>
          ))}
      </BottomSheetView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: spacing.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  text: { flex: 1 },
  muted: { color: lightColors.onSurfaceVariant },
});
