import { formatMoney } from '@meledger/shared';
import { format, isSameDay, startOfDay, subDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { type Ref, type RefObject, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AmountField } from '@/components/ui/AmountField';
import { Button } from '@/components/ui/Button';
import { Chip, ChipGroup } from '@/components/ui/Chip';
import { DatePickerSheet } from '@/components/ui/DatePickerSheet';
import { FieldCard } from '@/components/ui/FieldCard';
import { Sheet, type SheetRef } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import type { Wallet } from '@/db/schema';
import { spacing } from '@/theme/tokens';

export interface MoneyValues {
  amount: number;
  walletId: string;
  occurredAt: Date;
  feeAmount: number;
}

interface MoneySheetProps {
  ref: Ref<SheetRef>;
  title: string;
  /** Short line under the title, e.g. "UGX 70,000 still owed". */
  hint?: string;
  confirmLabel: string;
  initialAmount: number;
  /** Wallets to choose from; omit to hide the wallet field (goal top-ups). */
  wallets?: Wallet[];
  initialWalletId?: string | null;
  walletLabel?: string;
  /** Shows an optional fee (mobile money transfers). */
  withFee?: boolean;
  /** Cap on the amount, with the message shown above it. */
  max?: { amount: number; message: string };
  onSubmit: (values: MoneyValues) => Promise<void>;
}

/**
 * Small sheet for one amount of money: how much, from or to which wallet, and when. It resets
 * each time it opens.
 */
export function MoneySheet({ ref, title, ...form }: MoneySheetProps) {
  // Keyed by each opening so the fields start from the initial values every time.
  const [opening, setOpening] = useState(0);
  const close = () => (ref as RefObject<SheetRef | null>)?.current?.dismiss();
  return (
    <Sheet ref={ref} title={title} onDismiss={() => setOpening((n) => n + 1)}>
      <MoneyForm key={opening} {...form} onClose={close} />
    </Sheet>
  );
}

function MoneyForm({
  onClose,
  hint,
  confirmLabel,
  initialAmount,
  wallets,
  initialWalletId,
  walletLabel = 'Wallet',
  withFee = false,
  max,
  onSubmit,
}: Omit<MoneySheetProps, 'ref' | 'title'> & { onClose: () => void }) {
  const active = wallets?.filter((w) => !w.archived) ?? [];
  const [amount, setAmount] = useState(initialAmount);
  const [fee, setFee] = useState(0);
  const [walletId, setWalletId] = useState(initialWalletId ?? active[0]?.id ?? '');
  const [date, setDate] = useState(() => new Date());
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const dateSheet = useRef<SheetRef>(null);
  const today = startOfDay(new Date());

  const submit = async () => {
    if (amount <= 0) {
      setError('Enter an amount');
      return;
    }
    if (max && amount > max.amount) {
      setError(max.message);
      return;
    }
    if (wallets && !walletId) {
      setError('Choose a wallet');
      return;
    }
    setSaving(true);
    await onSubmit({ amount, walletId, occurredAt: date, feeAmount: fee });
    setSaving(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  return (
    <View style={styles.body}>
      {hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
      <AmountField
        label="Amount"
        value={amount}
        onChange={(v) => {
          setAmount(v);
          setError(undefined);
        }}
        size="xl"
        inSheet
        error={error}
      />
      {withFee ? (
        <AmountField label="Fee (optional)" value={fee} onChange={setFee} inSheet />
      ) : null}
      {wallets ? (
        <FieldCard label={walletLabel}>
          <ChipGroup>
            {active.map((w) => (
              <Chip
                key={w.id}
                label={w.name}
                icon={w.icon}
                tone="muted"
                selected={w.id === walletId}
                onPress={() => setWalletId(w.id)}
              />
            ))}
          </ChipGroup>
        </FieldCard>
      ) : null}
      <FieldCard label="Date">
        <ChipGroup>
          <Chip
            label="Today"
            tone="muted"
            selected={isSameDay(date, today)}
            onPress={() => setDate(new Date())}
          />
          <Chip
            label="Yesterday"
            tone="muted"
            selected={isSameDay(date, subDays(today, 1))}
            onPress={() => setDate(subDays(new Date(), 1))}
          />
          <Chip
            label={
              isSameDay(date, today) || isSameDay(date, subDays(today, 1))
                ? 'Pick a day'
                : format(date, 'd MMM yyyy')
            }
            icon="calendar"
            tone="muted"
            selected={!isSameDay(date, today) && !isSameDay(date, subDays(today, 1))}
            onPress={() => dateSheet.current?.present()}
          />
        </ChipGroup>
      </FieldCard>
      <Button
        label={amount > 0 ? `${confirmLabel} · ${formatMoney(amount)}` : confirmLabel}
        onPress={submit}
        loading={saving}
        block
      />
      <DatePickerSheet
        ref={dateSheet}
        value={date}
        maxDate={new Date()}
        onChange={(picked) => {
          const next = new Date();
          next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
          setDate(next);
          setTimeout(() => dateSheet.current?.dismiss(), 180);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.gutter, gap: spacing.md },
});
