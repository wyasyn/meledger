import { zodResolver } from '@hookform/resolvers/zod';
import { BUDGET_PERIODS, type BudgetInput, BudgetInputSchema } from '@meledger/shared';
import { addDays, format, startOfDay } from 'date-fns';
import { type ReactNode, useRef } from 'react';
import { type Path, type PathValue, useForm, useWatch } from 'react-hook-form';
import { Keyboard, StyleSheet, View } from 'react-native';

import { AmountField } from '@/components/ui/AmountField';
import { Button } from '@/components/ui/Button';
import { Calendar } from '@/components/ui/Calendar';
import { Chip, ChipGroup } from '@/components/ui/Chip';
import { FieldCard } from '@/components/ui/FieldCard';
import { Icon } from '@/components/ui/Icon';
import { IconTile } from '@/components/ui/IconTile';
import type { SheetRef } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import type { Category } from '@/db/schema';
import { CategoryPickerSheet } from '@/features/transactions/components/CategoryPickerSheet';
import { lightColors, spacing } from '@/theme/tokens';

import { BUDGET_PERIOD_LABELS } from '../logic';
import { FormScreen } from './FormScreen';

const ALERTS = [50, 80, 90, 100] as const;

interface BudgetFormProps {
  title: string;
  initial: BudgetInput;
  categories: Category[];
  onSubmit: (values: BudgetInput) => Promise<void>;
  children?: ReactNode;
}

export function BudgetForm({ title, initial, categories, onSubmit, children }: BudgetFormProps) {
  const { control, setValue, handleSubmit, formState } = useForm<BudgetInput>({
    resolver: zodResolver(BudgetInputSchema),
    defaultValues: initial,
  });
  const values = useWatch({ control }) as BudgetInput;
  const { errors, isSubmitting } = formState;
  const set = <K extends Path<BudgetInput>>(key: K, value: PathValue<BudgetInput, K>) =>
    setValue(key, value, { shouldDirty: true, shouldValidate: formState.isSubmitted });
  const categorySheet = useRef<SheetRef>(null);
  const category = categories.find((c) => c.id === values.categoryId);
  const today = startOfDay(new Date());

  return (
    <FormScreen title={title}>
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

      <AmountField
        label="Limit"
        value={values.limitAmount}
        onChange={(amount) => set('limitAmount', amount)}
        error={errors.limitAmount?.message}
      />

      <FieldCard label="Period" error={errors.startsAt?.message}>
        <ChipGroup>
          {BUDGET_PERIODS.map((period) => (
            <Chip
              key={period}
              label={BUDGET_PERIOD_LABELS[period]}
              tone="muted"
              selected={values.period === period}
              onPress={() => {
                set('period', period);
                if (period === 'custom' && !values.startsAt) {
                  set('startsAt', today);
                  set('endsAt', addDays(today, 7));
                }
              }}
            />
          ))}
        </ChipGroup>
        {values.period === 'custom' ? (
          <View style={styles.range}>
            <Text variant="caption" tone="muted">
              {values.startsAt && values.endsAt
                ? `${format(values.startsAt, 'd MMM yyyy')} to ${format(
                    addDays(values.endsAt, -1),
                    'd MMM yyyy',
                  )}`
                : 'Tap a start day, then an end day'}
            </Text>
            <Calendar
              mode="range"
              value={{
                from: values.startsAt ?? today,
                to: values.endsAt ? addDays(values.endsAt, -1) : null,
              }}
              onChange={(range) => {
                set('startsAt', startOfDay(range.from));
                set('endsAt', addDays(startOfDay(range.to ?? range.from), 1));
              }}
            />
          </View>
        ) : null}
      </FieldCard>

      <FieldCard label="Warn me at">
        <ChipGroup>
          {ALERTS.map((pct) => (
            <Chip
              key={pct}
              label={`${pct}%`}
              tone="muted"
              selected={values.alertAt === pct}
              onPress={() => set('alertAt', pct)}
            />
          ))}
        </ChipGroup>
      </FieldCard>

      <Button label="Save budget" onPress={handleSubmit(onSubmit)} loading={isSubmitting} block />
      {children}

      <CategoryPickerSheet
        ref={categorySheet}
        categories={categories}
        kind="expense"
        selectedId={values.categoryId || null}
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
  range: { gap: spacing.sm, marginTop: spacing.sm },
});
