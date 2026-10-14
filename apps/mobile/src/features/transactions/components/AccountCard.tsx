import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { FieldCard } from '@/components/ui/FieldCard';
import { IconTile } from '@/components/ui/IconTile';
import { Text } from '@/components/ui/Text';
import { lightColors, spacing } from '@/theme/tokens';

import type { LedgerData } from '../useLedgerData';

interface AccountCardProps {
  label: string;
  wallet: LedgerData['wallets'][number] | undefined;
  isMain: boolean;
  onChange: () => void;
  error?: string;
  /** Orange "check this" ring for a value the voice parser was unsure of. */
  attention?: string;
  emptyHint?: string;
}

/** "Account" row from the Add New inspiration: wallet tile, name, Change button. */
export function AccountCard({
  label,
  wallet,
  isMain,
  onChange,
  error,
  attention,
  emptyHint,
}: AccountCardProps) {
  return (
    <FieldCard error={error && !emptyHint ? error : undefined} attention={attention}>
      <View style={styles.row}>
        <IconTile
          icon={wallet?.icon ?? 'wallet'}
          color={wallet?.color ?? lightColors.onSurfaceVariant}
          round
        />
        <View style={styles.flex}>
          <Text variant="caption" tone="muted">
            {label}
          </Text>
          {wallet ? (
            <Text variant="subtitle" numberOfLines={1}>
              {wallet.name}
              {isMain ? (
                <Text variant="body" tone="muted">
                  {' '}
                  (Main wallet)
                </Text>
              ) : null}
            </Text>
          ) : (
            <Text variant="subtitle" tone="muted">
              {emptyHint ?? 'Choose a wallet'}
            </Text>
          )}
        </View>
        {emptyHint ? (
          <Button
            label="Add wallet"
            variant="secondary"
            size="sm"
            onPress={() => router.push('/wallets/new')}
          />
        ) : (
          <Button label="Change" variant="secondary" size="sm" onPress={onChange} />
        )}
      </View>
    </FieldCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
});
