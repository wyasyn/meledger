import { zodResolver } from '@hookform/resolvers/zod';
import {
  CATEGORY_COLORS,
  type CategoryColor,
  type WalletInput,
  WalletInputSchema,
  WALLET_TYPES,
} from '@meledger/shared';
import type { ReactNode } from 'react';
import { type Path, type PathValue, useForm, useWatch } from 'react-hook-form';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountField } from '@/components/ui/AmountField';
import { Button } from '@/components/ui/Button';
import { Chip, ChipGroup } from '@/components/ui/Chip';
import { FieldCard } from '@/components/ui/FieldCard';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
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

const COLORS = Object.keys(CATEGORY_COLORS) as CategoryColor[];

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
    <KeyboardAvoidingView style={styles.root} behavior="padding">
      <ScreenHeader title={title} />
      <ScrollView
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
          <View style={styles.swatches}>
            {COLORS.map((color) => {
              const selected = values.color === color;
              return (
                <PressableScale
                  key={color}
                  onPress={() => set('color', color)}
                  scaleTo={0.88}
                  accessibilityRole="radio"
                  accessibilityLabel={color}
                  accessibilityState={{ selected }}
                  style={[
                    styles.swatch,
                    { backgroundColor: CATEGORY_COLORS[color] },
                    selected && {
                      boxShadow: `0 0 0 3px #FFFFFF, 0 0 0 5px ${CATEGORY_COLORS[color]}`,
                    },
                  ]}
                >
                  {selected ? <Icon name="check" weight="bold" size={16} color="#FFFFFF" /> : null}
                </PressableScale>
              );
            })}
          </View>
        </FieldCard>

        <Button label="Save" onPress={handleSubmit(onSubmit)} loading={isSubmitting} block />
        {footer}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.background },
  content: { paddingHorizontal: spacing.gutter, gap: spacing.md },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingVertical: 4 },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
