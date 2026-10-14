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
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button, Chip, Icon } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FieldCard } from '@/components/ui/FieldCard';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { AmountInput } from '@/features/transactions/components/TransactionForm';
import { fontFamily } from '@/theme/fonts';
import { lightColors, radius, spacing } from '@/theme/tokens';

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
    <View style={styles.root}>
      <ScreenHeader title={title} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <FieldCard label="Name" error={errors.name?.message}>
          <TextInput
            value={values.name}
            onChangeText={(name) => set('name', name)}
            placeholder="e.g. MTN MoMo"
            placeholderTextColor={lightColors.onSurfaceVariant}
            maxLength={40}
            autoFocus={!editing}
            accessibilityLabel="Wallet name"
            style={styles.input}
          />
        </FieldCard>

        <FieldCard label="Type">
          <View style={styles.chips}>
            {WALLET_TYPES.map((type) => (
              <Chip
                key={type}
                icon={WALLET_TYPE_META[type].icon}
                selected={values.type === type}
                showSelectedCheck={false}
                onPress={() => {
                  set('type', type);
                  set('color', WALLET_TYPE_META[type].color);
                }}
              >
                {WALLET_TYPE_META[type].label}
              </Chip>
            ))}
          </View>
        </FieldCard>

        <FieldCard label="Provider (optional)" error={errors.provider?.message}>
          <TextInput
            value={values.provider ?? ''}
            onChangeText={(provider) => set('provider', provider.trim() ? provider : null)}
            placeholder="e.g. MTN, Airtel, Stanbic"
            placeholderTextColor={lightColors.onSurfaceVariant}
            maxLength={40}
            accessibilityLabel="Provider"
            style={styles.input}
          />
        </FieldCard>

        <FieldCard
          label={editing ? 'Opening balance' : 'Current balance'}
          error={errors.openingBalance?.message}
        >
          <AmountInput
            value={values.openingBalance}
            onChange={(amount) => set('openingBalance', amount)}
            accessibilityLabel={editing ? 'Opening balance' : 'Current balance'}
          />
        </FieldCard>

        <FieldCard label="Colour">
          <View style={styles.chips}>
            {COLORS.map((color) => (
              <Pressable
                key={color}
                onPress={() => set('color', color)}
                accessibilityRole="radio"
                accessibilityLabel={color}
                accessibilityState={{ selected: values.color === color }}
                style={[styles.swatch, { backgroundColor: CATEGORY_COLORS[color] }]}
              >
                {values.color === color ? (
                  <Icon source="check" size={18} color={lightColors.onPrimary} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </FieldCard>

        <Button
          mode="contained"
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          disabled={isSubmitting}
          style={styles.save}
          contentStyle={styles.saveContent}
        >
          Save
        </Button>
        {footer}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.background },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md },
  input: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    color: lightColors.onSurface,
    padding: 0,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  save: { borderRadius: radius.pill, marginTop: spacing.sm },
  saveContent: { height: 52 },
});
