import { formatMoney } from '@meledger/shared';
import type { Ref } from 'react';
import { StyleSheet, View } from 'react-native';

import { ListGroup, ListRow } from '@/components/ui/ListGroup';
import { Sheet, type SheetRef } from '@/components/ui/Sheet';
import type { Wallet } from '@/db/schema';
import { spacing } from '@/theme/tokens';

interface WalletPickerSheetProps {
  ref: Ref<SheetRef>;
  title: string;
  wallets: Wallet[];
  selectedId: string | null;
  mainId: string | null;
  onSelect: (id: string) => void;
  /** Current balance per wallet id, shown on the right when known. */
  balances?: Map<string, number>;
}

export function WalletPickerSheet({
  ref,
  title,
  wallets,
  selectedId,
  mainId,
  onSelect,
  balances,
}: WalletPickerSheetProps) {
  return (
    <Sheet ref={ref} title={title}>
      <View style={styles.list}>
        <ListGroup>
          {wallets
            .filter((w) => !w.archived || w.id === selectedId)
            .map((wallet) => {
              const balance = balances?.get(wallet.id);
              return (
                <ListRow
                  key={wallet.id}
                  title={wallet.name}
                  subtitle={wallet.id === mainId ? 'Main wallet' : undefined}
                  icon={wallet.icon}
                  iconColor={wallet.color}
                  value={balance !== undefined ? formatMoney(balance) : undefined}
                  selected={wallet.id === selectedId}
                  onPress={() => onSelect(wallet.id)}
                />
              );
            })}
        </ListGroup>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.gutter },
});
