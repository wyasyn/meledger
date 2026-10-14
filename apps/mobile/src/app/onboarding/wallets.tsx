import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { AmountField } from '@/components/ui/AmountField';
import { IconTile } from '@/components/ui/IconTile';
import { Switch } from '@/components/ui/Switch';
import { Text } from '@/components/ui/Text';
import { saveOnboardingWallets } from '@/features/onboarding/finish';
import { nextStep, OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { useOnboarding } from '@/features/onboarding/store';
import { WALLET_TYPE_META } from '@/features/wallets/logic';
import { lightColors, radius, shadow, spacing } from '@/theme/tokens';

export default function WalletsStep() {
  const wallets = useOnboarding((s) => s.wallets);
  const updateWallet = useOnboarding((s) => s.updateWallet);
  const anySelected = wallets.some((w) => w.selected);
  const [saving, setSaving] = useState(false);

  // The wallets exist from here on, so the "Try it" step can save its entry into one.
  const next = async () => {
    setSaving(true);
    try {
      await saveOnboardingWallets();
      nextStep('wallets');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingStep
      step="wallets"
      icon="wallet"
      title="Your wallets"
      body="Where do you keep money? Add how much is in each right now. You can add more later."
      primary={{ label: 'Continue', onPress: next, disabled: !anySelected, loading: saving }}
    >
      {wallets.map((wallet) => {
        const meta = WALLET_TYPE_META[wallet.type];
        return (
          <View key={wallet.key} style={styles.card}>
            <View style={styles.row}>
              <IconTile icon={meta.icon} color={meta.color} size={40} />
              <Text variant="subtitle" style={styles.flex}>
                {wallet.name}
              </Text>
              <Switch
                value={wallet.selected}
                onValueChange={(selected) => updateWallet(wallet.key, { selected })}
                accessibilityLabel={`Use ${wallet.name}`}
              />
            </View>
            {wallet.selected ? (
              <Animated.View entering={FadeIn.duration(220)}>
                <AmountField
                  label="Current balance"
                  value={wallet.balance}
                  onChange={(balance) => updateWallet(wallet.key, { balance })}
                  accessibilityLabel={`${wallet.name} current balance`}
                  inset
                />
              </Animated.View>
            ) : null}
          </View>
        );
      })}
      {!anySelected ? (
        <Text variant="small" tone="muted" align="center">
          Choose at least one wallet.
        </Text>
      ) : null}
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: lightColors.surface,
    boxShadow: shadow.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
});
