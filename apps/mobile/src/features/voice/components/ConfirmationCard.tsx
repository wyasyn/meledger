import { formatMoney, type ParseField, type TransactionType } from '@meledger/shared';
import { format } from 'date-fns';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

import { AmountField } from '@/components/ui/AmountField';
import { Chip } from '@/components/ui/Chip';
import { FieldCard } from '@/components/ui/FieldCard';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { IconTile } from '@/components/ui/IconTile';
import { Menu } from '@/components/ui/Menu';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { AccountCard } from '@/features/transactions/components/AccountCard';
import { TagChip } from '@/features/transactions/components/TagChip';
import { dateLabel } from '@/features/transactions/logic';
import type { LedgerData } from '@/features/transactions/useLedgerData';
import { lightColors, radius, shadow, spacing } from '@/theme/tokens';

import type { VoiceDraft } from '../logic';

const TYPE_LABELS: Record<TransactionType, string> = {
  expense: 'Expense',
  income: 'Income',
  transfer: 'Transfer',
};

const TYPE_ITEMS = (Object.keys(TYPE_LABELS) as TransactionType[]).map((value) => ({
  value,
  label: TYPE_LABELS[value],
  icon: value === 'transfer' ? ('transfer' as const) : value,
}));

const CHECK = 'Check this';

export type PickerField = 'wallet' | 'toWallet' | 'category' | 'tag' | 'date';

export type DraftErrors = Partial<
  Record<'amount' | 'walletId' | 'toWalletId' | 'categoryId', string>
>;

interface ConfirmationCardProps {
  draft: VoiceDraft;
  index: number;
  total: number;
  data: LedgerData;
  mainId: string | null;
  errors: DraftErrors;
  onChange: (draft: VoiceDraft) => void;
  onRemove: () => void;
  onPick: (field: PickerField) => void;
}

/**
 * One parsed entry, laid out like the manual "Add New" form (build prompt section 5.2). Fields
 * the parser was unsure of carry an orange "Check this" ring until the user touches them.
 */
export function ConfirmationCard({
  draft,
  index,
  total,
  data,
  mainId,
  errors,
  onChange,
  onRemove,
  onPick,
}: ConfirmationCardProps) {
  const { input, parsed } = draft;
  const transfer = input.type === 'transfer';
  const category = data.categories.find((c) => c.id === input.categoryId);
  const wallet = data.wallets.find((w) => w.id === input.walletId);
  const toWallet = data.wallets.find((w) => w.id === input.toWalletId);
  const tagsById = new Map(data.tags.map((t) => [t.id, t]));
  // A field stops asking for attention once the user has changed it.
  const unsure = (field: ParseField, changed: boolean) =>
    parsed.uncertain.includes(field) && !changed ? CHECK : undefined;

  const set = (patch: Partial<VoiceDraft['input']>) =>
    onChange({ ...draft, input: { ...input, ...patch } });

  const changeType = (type: TransactionType) => {
    const patch: Partial<VoiceDraft['input']> = { type };
    if (type === 'transfer') {
      patch.toWalletId =
        input.toWalletId ??
        data.wallets.find((w) => !w.archived && w.id !== input.walletId)?.id ??
        null;
    } else if (category && category.kind !== type) {
      patch.categoryId = null;
    }
    set(patch);
  };

  const label = total > 1 ? `Entry ${index + 1} of ${total}` : 'New entry';

  if (!draft.savable) {
    return (
      <Animated.View
        entering={FadeInDown.duration(260)}
        exiting={FadeOut.duration(160)}
        layout={LinearTransition}
      >
        <View style={styles.header}>
          <Text variant="label" tone="muted" style={styles.flex}>
            {label}
          </Text>
          <IconButton
            icon="close"
            label="Remove this entry"
            variant="surface"
            size={36}
            onPress={onRemove}
          />
        </View>
        <FieldCard>
          <View style={styles.row}>
            <IconTile icon="coins" color={lightColors.onSurfaceVariant} size={40} />
            <View style={styles.flex}>
              <Text variant="subtitle">{debtTitle(draft)}</Text>
              <Text variant="caption" tone="muted">
                {"Loans and repayments arrive with the Plan tab soon. This one won't be saved yet."}
              </Text>
            </View>
          </View>
        </FieldCard>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(260).delay(index * 60)}
      exiting={FadeOut.duration(160)}
      layout={LinearTransition}
      style={styles.card}
    >
      <View style={styles.header}>
        <Text variant="label" tone="muted" style={styles.flex}>
          {label}
        </Text>
        <Menu
          items={TYPE_ITEMS}
          selected={input.type}
          onSelect={changeType}
          accessibilityLabel="Entry type"
          anchor={(open) => (
            <PressableScale
              onPress={open}
              accessibilityRole="button"
              accessibilityLabel={`Entry type: ${TYPE_LABELS[input.type]}. Change`}
              style={[
                styles.typePill,
                unsure('type', input.type !== parsed.type) && styles.typePillCheck,
              ]}
            >
              <Text variant="label">{TYPE_LABELS[input.type]}</Text>
              <Icon name="chevron-down" weight="bold" size={14} color={lightColors.onSurface} />
            </PressableScale>
          )}
        />
        {total > 1 ? (
          <IconButton
            icon="close"
            label="Remove this entry"
            variant="surface"
            size={36}
            onPress={onRemove}
          />
        ) : null}
      </View>

      <AccountCard
        label={transfer ? 'From' : 'Account'}
        wallet={wallet}
        isMain={input.walletId === mainId}
        onChange={() => onPick('wallet')}
        error={errors.walletId}
        attention={unsure('wallet', input.walletId !== parsed.walletId)}
      />
      {transfer ? (
        <AccountCard
          label="To"
          wallet={toWallet}
          isMain={input.toWalletId === mainId}
          onChange={() => onPick('toWallet')}
          error={errors.toWalletId}
          attention={unsure('wallet', input.toWalletId !== parsed.toWalletId)}
        />
      ) : null}

      <AmountField
        label="Amount"
        value={input.amount}
        onChange={(amount) => set({ amount })}
        size="xl"
        error={errors.amount}
        attention={
          draft.heardUsd !== null && input.amount === 0
            ? `Heard $${draft.heardUsd}. Enter it in UGX.`
            : unsure('amount', input.amount !== (parsed.amount ?? 0))
        }
      />

      {transfer ? (
        <AmountField
          label="Fee (optional)"
          value={input.feeAmount}
          onChange={(feeAmount) => set({ feeAmount })}
          accessibilityLabel="Transfer fee"
        />
      ) : (
        <FieldCard
          label="Category"
          error={errors.categoryId}
          attention={unsure('category', input.categoryId !== parsed.categoryId)}
          onPress={() => onPick('category')}
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
      )}

      <FieldCard label="Tag">
        <View style={styles.chips}>
          {input.tagIds.map((id) => {
            const tag = tagsById.get(id);
            return tag ? (
              <TagChip
                key={id}
                tag={tag}
                onRemove={() => set({ tagIds: input.tagIds.filter((t) => t !== id) })}
              />
            ) : null;
          })}
          <Chip label="Add tag" icon="plus" tone="muted" onPress={() => onPick('tag')} />
        </View>
      </FieldCard>

      <FieldCard
        label="Date"
        onPress={() => onPick('date')}
        accessibilityLabel={`Date: ${format(input.occurredAt, 'd MMMM yyyy')}. Change`}
      >
        <View style={styles.row}>
          <Text variant="subtitle" style={styles.flex}>
            {dateLabel(input.occurredAt)}
          </Text>
          <Icon name="calendar" size={22} color={lightColors.onSurface} />
        </View>
      </FieldCard>

      <TextField
        label="Note"
        value={input.note}
        onChangeText={(note) => set({ note })}
        placeholder="What was it for?"
        maxLength={200}
      />
    </Animated.View>
  );
}

function debtTitle({ parsed }: VoiceDraft): string {
  const amount = parsed.amount ? formatMoney(parsed.amount, parsed.currency) : 'an amount';
  const person = parsed.person ?? 'someone';
  switch (parsed.debt) {
    case 'lend':
      return `Lent ${person} ${amount}`;
    case 'borrow':
      return `Borrowed ${amount} from ${person}`;
    case 'repaid_to_me':
      return `${person} paid back ${amount}`;
    default:
      return `Paid back ${person} ${amount}`;
  }
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: lightColors.surface,
    boxShadow: shadow.card,
  },
  typePillCheck: { boxShadow: `0 0 0 2px ${lightColors.warning}66` },
});
