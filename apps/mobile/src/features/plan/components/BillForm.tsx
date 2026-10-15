import { zodResolver } from '@hookform/resolvers/zod';
import { RECURRING_FREQUENCIES, type RecurringInput, RecurringInputSchema } from '@meledger/shared';
import { type ReactNode, useRef } from 'react';
import { type Path, type PathValue, useForm, useWatch } from 'react-hook-form';
import { Keyboard, StyleSheet, View } from 'react-native';

import { AmountField } from '@/components/ui/AmountField';
import { Button } from '@/components/ui/Button';
import { Chip, ChipGroup } from '@/components/ui/Chip';
import { FieldCard } from '@/components/ui/FieldCard';
import { Icon } from '@/components/ui/Icon';
import { IconTile } from '@/components/ui/IconTile';
import type { SheetRef } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import type { Category, Wallet } from '@/db/schema';
import { CategoryPickerSheet } from '@/features/transactions/components/CategoryPickerSheet';
import { lightColors, spacing } from '@/theme/tokens';

import { FREQUENCY_LABELS } from '../logic';
import { DateField } from './DateField';
import { FormScreen } from './FormScreen';

interface BillFormProps {
  title: string;
  initial: RecurringInput;
  categories: Category[];
  wallets: Wallet[];
  onSubmit: (values: RecurringInput) => Promise<void>;
  autoFocus?: boolean;
  children?: ReactNode;
}

/** A bill that comes back (rent, Yaka, school fees). The app reminds; the user confirms. */
export function BillForm({
  title,
  initial,
  categories,
  wallets,
  onSubmit,
  autoFocus = false,
  children,
}: BillFormProps) {
  const { control, setValue, handleSubmit, formState } = useForm<RecurringInput>({
    resolver: zodResolver(RecurringInputSchema),
    defaultValues: initial,
  });
  const values = useWatch({ control }) as RecurringInput;
  const { errors, isSubmitting } = formState;
  const set = <K extends Path<RecurringInput>>(key: K, value: PathValue<RecurringInput, K>) =>
    setValue(key, value, { shouldDirty: true, shouldValidate: formState.isSubmitted });
  const categorySheet = useRef<SheetRef>(null);
  const category = categories.find((c) => c.id === values.categoryId);
  const active = wallets.filter((w) => !w.archived || w.id === values.walletId);

  return (
    <FormScreen title={title}>
      <TextField
        label="Name"
        value={values.name}
        onChangeText={(name) => set('name', name)}
        placeholder="e.g. Rent, Yaka, School fees"
        maxLength={40}
        autoFocus={autoFocus}
        error={errors.name?.message}
      />
      <FieldCard label="Type">
        <ChipGroup>
          {(['expense', 'income'] as const).map((type) => (
            <Chip
              key={type}
              label={type === 'expense' ? 'Bill to pay' : 'Money coming in'}
              icon={type}
              tone="muted"
              selected={values.type === type}
              onPress={() => {
                set('type', type);
                if (category && category.kind !== type) set('categoryId', null);
              }}
            />
          ))}
        </ChipGroup>
      </FieldCard>
      <AmountField
        label="Amount"
        value={values.amount}
        onChange={(amount) => set('amount', amount)}
        error={errors.amount?.message}
      />
      <FieldCard
        label="Category"
        error={errors.categoryId?.message}
        onPress={() => {
          Keyboard.dismiss();
          categorySheet.current?.present();
        }}
        accessibilityLabel={`Category: ${category?.name ?? 'none'}. Change`}
      >
        <View style={styles.row}>
          <IconTile
            icon={category?.icon ?? 'category'}
            color={category?.color ?? lightColors.onSurfaceVariant}
            size={40}
          />
          <Text variant="subtitle" tone={category ? 'default' : 'muted'} style={styles.flex}>
            {category?.name ?? 'Choose a category'}
          </Text>
          <Icon name="chevron-right" size={18} color={lightColors.onSurfaceVariant} />
        </View>
      </FieldCard>
      <FieldCard label="Wallet" error={errors.walletId?.message}>
        <ChipGroup>
          {active.map((w) => (
            <Chip
              key={w.id}
              label={w.name}
              icon={w.icon}
              tone="muted"
              selected={values.walletId === w.id}
              onPress={() => set('walletId', w.id)}
            />
          ))}
        </ChipGroup>
      </FieldCard>
      <FieldCard label="Repeats">
        <ChipGroup>
          {RECURRING_FREQUENCIES.map((f) => (
            <Chip
              key={f}
              label={FREQUENCY_LABELS[f]}
              tone="muted"
              selected={values.frequency === f}
              onPress={() => set('frequency', f)}
            />
          ))}
        </ChipGroup>
      </FieldCard>
      <DateField
        label="Next due"
        value={values.nextDueAt}
        onChange={(date) => date && set('nextDueAt', date)}
      />
      <Button label="Save bill" onPress={handleSubmit(onSubmit)} loading={isSubmitting} block />
      {children}

      <CategoryPickerSheet
        ref={categorySheet}
        categories={categories}
        kind={values.type}
        selectedId={values.categoryId}
        onSelect={(id) => {
          set('categoryId', id);
          categorySheet.current?.dismiss();
        }}
      />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
});
