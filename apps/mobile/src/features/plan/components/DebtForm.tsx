import { zodResolver } from '@hookform/resolvers/zod';
import { type DebtInput, DebtInputSchema } from '@meledger/shared';
import type { ReactNode } from 'react';
import { type Path, type PathValue, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { AmountField } from '@/components/ui/AmountField';
import { Button } from '@/components/ui/Button';
import { Chip, ChipGroup } from '@/components/ui/Chip';
import { FieldCard } from '@/components/ui/FieldCard';
import { Switch } from '@/components/ui/Switch';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import type { Wallet } from '@/db/schema';
import { spacing } from '@/theme/tokens';

import { DateField } from './DateField';
import { FormScreen } from './FormScreen';

interface DebtFormProps {
  title: string;
  initial: DebtInput;
  /** Names already used, offered as chips. */
  people: string[];
  /** Wallets for recording the loan as an entry; omit when editing. */
  wallets?: Wallet[];
  onSubmit: (values: DebtInput) => Promise<void>;
  autoFocus?: boolean;
  children?: ReactNode;
}

export function DebtForm({
  title,
  initial,
  people,
  wallets,
  onSubmit,
  autoFocus = false,
  children,
}: DebtFormProps) {
  const { control, setValue, handleSubmit, formState } = useForm<DebtInput>({
    resolver: zodResolver(DebtInputSchema),
    defaultValues: initial,
  });
  const values = useWatch({ control }) as DebtInput;
  const { errors, isSubmitting } = formState;
  const set = <K extends Path<DebtInput>>(key: K, value: PathValue<DebtInput, K>) =>
    setValue(key, value, { shouldDirty: true, shouldValidate: formState.isSubmitted });
  const owedToMe = values.direction === 'owed_to_me';
  const active = wallets?.filter((w) => !w.archived) ?? [];
  const suggestions = people.filter(
    (p) => p.toLowerCase().startsWith(values.person.trim().toLowerCase()) && p !== values.person,
  );

  return (
    <FormScreen title={title}>
      <FieldCard label="Direction">
        <ChipGroup>
          <Chip
            label="They owe me"
            icon="lend"
            tone="muted"
            selected={owedToMe}
            onPress={() => set('direction', 'owed_to_me')}
          />
          <Chip
            label="I owe them"
            icon="borrow"
            tone="muted"
            selected={!owedToMe}
            onPress={() => set('direction', 'i_owe')}
          />
        </ChipGroup>
      </FieldCard>
      <TextField
        label="Person"
        value={values.person}
        onChangeText={(person) => set('person', person)}
        placeholder="e.g. Musa"
        maxLength={40}
        autoFocus={autoFocus}
        autoCapitalize="words"
        error={errors.person?.message}
      />
      {suggestions.length > 0 ? (
        <ChipGroup>
          {suggestions.slice(0, 6).map((name) => (
            <Chip key={name} label={name} icon="user" onPress={() => set('person', name)} />
          ))}
        </ChipGroup>
      ) : null}
      <AmountField
        label={owedToMe ? 'Amount lent' : 'Amount borrowed'}
        value={values.principal}
        onChange={(amount) => set('principal', amount)}
        error={errors.principal?.message}
      />
      <DateField
        label={owedToMe ? 'Lent on' : 'Borrowed on'}
        value={values.startedAt}
        onChange={(date) => date && set('startedAt', date)}
        past
      />
      <DateField
        label="Due back"
        value={values.dueAt}
        onChange={(date) => set('dueAt', date)}
        emptyLabel="No due date"
      />
      <TextField
        label="Note (optional)"
        value={values.note}
        onChangeText={(note) => set('note', note)}
        placeholder="What was it for?"
        maxLength={200}
      />
      {wallets ? (
        <FieldCard label="Wallet">
          <View style={styles.switchRow}>
            <View style={styles.flex}>
              <Text variant="bodyStrong">
                {owedToMe ? 'Money left one of my wallets' : 'Money came into one of my wallets'}
              </Text>
              <Text variant="caption" tone="muted">
                Off for an old debt that is already in your balances.
              </Text>
            </View>
            <Switch
              value={values.walletId !== null}
              onValueChange={(on) => set('walletId', on ? (active[0]?.id ?? null) : null)}
              accessibilityLabel="Record it in a wallet"
            />
          </View>
          {values.walletId !== null ? (
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
          ) : null}
        </FieldCard>
      ) : null}
      <Button label="Save" onPress={handleSubmit(onSubmit)} loading={isSubmitting} block />
      {children}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: 2 },
});
