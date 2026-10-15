import { zodResolver } from '@hookform/resolvers/zod';
import { type WalletInput, WalletInputSchema, WALLET_TYPES } from '@meledger/shared';
import type { ReactNode } from 'react';
import { type Path, type PathValue, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountField } from '@/components/ui/AmountField';
import { Button } from '@/components/ui/Button';
import { Chip, ChipGroup } from '@/components/ui/Chip';
import { ColorSwatches } from '@/components/ui/ColorSwatches';
import { FieldCard } from '@/components/ui/FieldCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TextField } from '@/components/ui/TextField';
import { lightColors, spacing } from '@/theme/tokens';

import { WALLET_TYPE_META } from '../logic';

interface WalletFormProps {
  title: string;
  initial: WalletInput;
  onSubmit: (values: WalletInput) => Promise<void>;
  /** Edit mode labels the amount "Opening balance", since entries change the current one. */
  editing?: boolean;
  footer?: ReactNode;
}

export function WalletForm({ title, initial, onSubmit, editing = false, footer }: WalletFormProps) {
  const insets = useSafeAreaInsets();
  const { control, setValue, handleSubmit, formState } = useForm<WalletInput>({
    resolver: zodResolver(WalletInputSchema),
    defaultValues: initial,
  });
  const values = useWatch({ control }) as WalletInput;
  const { errors, isSubmitting } = formState;

  const set = <K extends Path<WalletInput>>(key: K, value: PathValue<WalletInput, K>) =>
    setValue(key, value, { shouldDirty: true, shouldValidate: formState.isSubmitted });

  return (
    <View style={styles.root}>
      <ScreenHeader title={title} />
      <KeyboardAwareScrollView
        bottomOffset={spacing.xxl}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <TextField
          label="Name"
          value={values.name}
          onChangeText={(name) => set('name', name)}
          placeholder="e.g. MTN MoMo"
          maxLength={40}
          autoFocus={!editing}
          error={errors.name?.message}
        />

        <FieldCard label="Type">
          <ChipGroup>
            {WALLET_TYPES.map((type) => (
              <Chip
                key={type}
                label={WALLET_TYPE_META[type].label}
                icon={WALLET_TYPE_META[type].icon}
                tone="muted"
                selected={values.type === type}
                onPress={() => {
                  set('type', type);
                  set('color', WALLET_TYPE_META[type].color);
                }}
              />
            ))}
          </ChipGroup>
        </FieldCard>

        <TextField
          label="Provider (optional)"
          value={values.provider ?? ''}
          onChangeText={(provider) => set('provider', provider.trim() ? provider : null)}
          placeholder="e.g. MTN, Airtel, Stanbic"
          maxLength={40}
          error={errors.provider?.message}
        />

        <AmountField
          label={editing ? 'Opening balance' : 'Current balance'}
          value={values.openingBalance}
          onChange={(amount) => set('openingBalance', amount)}
          error={errors.openingBalance?.message}
        />

        <FieldCard label="Colour">
          <ColorSwatches value={values.color} onChange={(color) => set('color', color)} />
        </FieldCard>

        <Button label="Save" onPress={handleSubmit(onSubmit)} loading={isSubmitting} block />
        {footer}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.background },
  // Top room so the first field's focus ring (drawn outside the card) isn't clipped.
  content: { paddingHorizontal: spacing.gutter, paddingTop: spacing.xs, gap: spacing.md },
});
