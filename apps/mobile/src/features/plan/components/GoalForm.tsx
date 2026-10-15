import { zodResolver } from '@hookform/resolvers/zod';
import { type GoalInput, GoalInputSchema } from '@meledger/shared';
import type { ReactNode } from 'react';
import { type Path, type PathValue, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AmountField } from '@/components/ui/AmountField';
import { Button } from '@/components/ui/Button';
import { ColorSwatches } from '@/components/ui/ColorSwatches';
import { FieldCard } from '@/components/ui/FieldCard';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { TextField } from '@/components/ui/TextField';
import { lightColors, radius, spacing } from '@/theme/tokens';

import { DateField } from './DateField';
import { FormScreen } from './FormScreen';

/** Icons a goal can use (stored icon keys). */
export const GOAL_ICONS = [
  'piggy-bank',
  'insurance',
  'house',
  'land',
  'car',
  'electronics',
  'phone',
  'school',
  'family',
  'travel',
  'business',
  'gift',
] as const;

interface GoalFormProps {
  title: string;
  initial: GoalInput;
  onSubmit: (values: GoalInput) => Promise<void>;
  autoFocus?: boolean;
  /** Under the form (e.g. contributions, delete). */
  children?: ReactNode;
}

export function GoalForm({ title, initial, onSubmit, autoFocus = false, children }: GoalFormProps) {
  const { control, setValue, handleSubmit, formState } = useForm<GoalInput>({
    resolver: zodResolver(GoalInputSchema),
    defaultValues: initial,
  });
  const values = useWatch({ control }) as GoalInput;
  const { errors, isSubmitting } = formState;
  const set = <K extends Path<GoalInput>>(key: K, value: PathValue<GoalInput, K>) =>
    setValue(key, value, { shouldDirty: true, shouldValidate: formState.isSubmitted });

  return (
    <FormScreen title={title}>
      <TextField
        label="Name"
        value={values.name}
        onChangeText={(name) => set('name', name)}
        placeholder="e.g. Laptop, School fees, Land"
        maxLength={40}
        autoFocus={autoFocus}
        error={errors.name?.message}
      />
      <AmountField
        label="Target"
        value={values.targetAmount}
        onChange={(amount) => set('targetAmount', amount)}
        error={errors.targetAmount?.message}
      />
      <DateField
        label="Target date"
        value={values.targetDate}
        onChange={(date) => set('targetDate', date)}
        emptyLabel="No target date"
      />
      <FieldCard label="Icon">
        <View style={styles.icons}>
          {GOAL_ICONS.map((icon) => {
            const selected = values.icon === icon;
            return (
              <PressableScale
                key={icon}
                onPress={() => set('icon', icon)}
                scaleTo={0.9}
                accessibilityRole="radio"
                accessibilityLabel={icon.replace('-', ' ')}
                accessibilityState={{ selected }}
                style={[styles.iconChoice, selected && styles.iconSelected]}
              >
                <IconTile icon={icon} color={values.color} size={44} />
              </PressableScale>
            );
          })}
        </View>
      </FieldCard>
      <FieldCard label="Colour">
        <ColorSwatches value={values.color} onChange={(color) => set('color', color)} />
      </FieldCard>
      <Button label="Save goal" onPress={handleSubmit(onSubmit)} loading={isSubmitting} block />
      {children}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconChoice: { padding: 3, borderRadius: radius.tile + 3 },
  iconSelected: { boxShadow: `0 0 0 2px ${lightColors.primary}` },
});
