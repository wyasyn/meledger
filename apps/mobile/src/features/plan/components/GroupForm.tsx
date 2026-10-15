import { zodResolver } from '@hookform/resolvers/zod';
import { type SavingsGroupInput, SavingsGroupInputSchema } from '@meledger/shared';
import { type ReactNode, useState } from 'react';
import { type Path, type PathValue, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, TextInput, View } from 'react-native';

import { AmountField } from '@/components/ui/AmountField';
import { Button } from '@/components/ui/Button';
import { Chip, ChipGroup } from '@/components/ui/Chip';
import { FieldCard } from '@/components/ui/FieldCard';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { PLACEHOLDER_COLOR, TextField } from '@/components/ui/TextField';
import { typography } from '@/theme/typography';
import { lightColors, radius, spacing } from '@/theme/tokens';

import { DateField } from './DateField';
import { FormScreen } from './FormScreen';

interface GroupFormProps {
  title: string;
  initial: SavingsGroupInput;
  onSubmit: (values: SavingsGroupInput) => Promise<void>;
  autoFocus?: boolean;
  children?: ReactNode;
}

/** A SACCO, VSLA or chama: contribution, how often, members and the user's payout turn. */
export function GroupForm({
  title,
  initial,
  onSubmit,
  autoFocus = false,
  children,
}: GroupFormProps) {
  const { control, setValue, handleSubmit, formState } = useForm<SavingsGroupInput>({
    resolver: zodResolver(SavingsGroupInputSchema),
    defaultValues: initial,
  });
  const values = useWatch({ control }) as SavingsGroupInput;
  const { errors, isSubmitting } = formState;
  const set = <K extends Path<SavingsGroupInput>>(key: K, value: PathValue<SavingsGroupInput, K>) =>
    setValue(key, value, { shouldDirty: true, shouldValidate: formState.isSubmitted });
  const [member, setMember] = useState('');
  const total = values.members.length + 1;

  const addMember = () => {
    const name = member.trim();
    if (!name || values.members.some((m) => m.toLowerCase() === name.toLowerCase())) return;
    set('members', [...values.members, name]);
    setMember('');
  };

  return (
    <FormScreen title={title}>
      <TextField
        label="Name"
        value={values.name}
        onChangeText={(name) => set('name', name)}
        placeholder="e.g. Kikuubo SACCO, Office chama"
        maxLength={40}
        autoFocus={autoFocus}
        error={errors.name?.message}
      />
      <AmountField
        label="Your contribution"
        value={values.contributionAmount}
        onChange={(amount) => set('contributionAmount', amount)}
        error={errors.contributionAmount?.message}
      />
      <FieldCard label="How often">
        <ChipGroup>
          <Chip
            label="Every week"
            tone="muted"
            selected={values.frequency === 'weekly'}
            onPress={() => set('frequency', 'weekly')}
          />
          <Chip
            label="Every month"
            tone="muted"
            selected={values.frequency === 'monthly'}
            onPress={() => set('frequency', 'monthly')}
          />
        </ChipGroup>
      </FieldCard>
      <DateField
        label="First contribution"
        value={values.cycleStart}
        onChange={(date) => date && set('cycleStart', date)}
      />
      <FieldCard label={`Other members (${values.members.length})`}>
        <View style={styles.addRow}>
          <TextInput
            value={member}
            onChangeText={setMember}
            onSubmitEditing={addMember}
            placeholder="Add a name"
            placeholderTextColor={PLACEHOLDER_COLOR}
            cursorColor={lightColors.primary}
            returnKeyType="done"
            submitBehavior="submit"
            autoCapitalize="words"
            maxLength={40}
            accessibilityLabel="Member name"
            style={styles.input}
          />
          <Button label="Add" size="sm" onPress={addMember} disabled={!member.trim()} />
        </View>
        {values.members.length > 0 ? (
          <View style={styles.members}>
            {values.members.map((name) => (
              <View key={name} style={styles.member}>
                <Text variant="label">{name}</Text>
                <IconButton
                  icon="close"
                  label={`Remove ${name}`}
                  size={24}
                  onPress={() =>
                    set(
                      'members',
                      values.members.filter((m) => m !== name),
                    )
                  }
                />
              </View>
            ))}
          </View>
        ) : null}
      </FieldCard>
      <FieldCard label="Your payout turn" error={errors.payoutTurn?.message}>
        <Text variant="caption" tone="muted">
          {values.payoutTurn
            ? `You receive on contribution ${values.payoutTurn} of ${total}.`
            : 'Pick your place if members take turns to receive the pot.'}
        </Text>
        <ChipGroup>
          <Chip
            label="No rotation"
            tone="muted"
            selected={values.payoutTurn === null}
            onPress={() => set('payoutTurn', null)}
          />
          {Array.from({ length: Math.min(total, 30) }, (_, i) => i + 1).map((turn) => (
            <Chip
              key={turn}
              label={String(turn)}
              tone="muted"
              selected={values.payoutTurn === turn}
              onPress={() => set('payoutTurn', turn)}
              accessibilityLabel={`Turn ${turn}`}
            />
          ))}
        </ChipGroup>
      </FieldCard>
      <Button label="Save group" onPress={handleSubmit(onSubmit)} loading={isSubmitting} block />
      {children}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    ...typography.subtitle,
    flex: 1,
    color: lightColors.onSurface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.small,
    backgroundColor: lightColors.background,
  },
  members: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: lightColors.background,
  },
});
