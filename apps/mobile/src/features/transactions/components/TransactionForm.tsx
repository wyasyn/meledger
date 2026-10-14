import { zodResolver } from '@hookform/resolvers/zod';
import {
  type TransactionInput,
  TransactionInputSchema,
  type TransactionType,
} from '@meledger/shared';
import { format, isToday, isYesterday } from 'date-fns';
import { router } from 'expo-router';
import { useMemo, useRef } from 'react';
import { type Path, type PathValue, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountField } from '@/components/ui/AmountField';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { DatePickerSheet } from '@/components/ui/DatePickerSheet';
import { FieldCard } from '@/components/ui/FieldCard';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { IconTile } from '@/components/ui/IconTile';
import { Menu } from '@/components/ui/Menu';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import type { SheetRef } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { mainWalletId } from '@/features/wallets/logic';
import { lightColors, radius, shadow, spacing } from '@/theme/tokens';

import type { LedgerData } from '../useLedgerData';
import { CategoryPickerSheet } from './CategoryPickerSheet';
import { TagChip } from './TagChip';
import { TagPickerSheet } from './TagPickerSheet';
import { WalletPickerSheet } from './WalletPickerSheet';

const TYPE_LABELS: Record<TransactionType, string> = {
  expense: 'Expense',
  income: 'Income',
  transfer: 'Transfer',
};

/** Height of the pinned Save bar, so focused fields scroll clear of it. */
const FOOTER = 86;

const TYPE_ITEMS = (Object.keys(TYPE_LABELS) as TransactionType[]).map((value) => ({
  value,
  label: TYPE_LABELS[value],
  icon: value === 'transfer' ? ('transfer' as const) : value,
}));

interface TransactionFormProps {
  title: string;
  data: LedgerData;
  initial: TransactionInput;
  onSubmit: (values: TransactionInput) => Promise<void>;
  onDelete?: () => void;
}

/** Manual add/edit entry form (build prompt section 5.3). */
export function TransactionForm({
  title,
  data,
  initial,
  onSubmit,
  onDelete,
}: TransactionFormProps) {
  const insets = useSafeAreaInsets();
  const { control, setValue, handleSubmit, formState } = useForm<TransactionInput>({
    resolver: zodResolver(TransactionInputSchema),
    defaultValues: initial,
  });
  const values = useWatch({ control }) as TransactionInput;
  const { errors, isSubmitting } = formState;

  const fromSheet = useRef<SheetRef>(null);
  const toSheet = useRef<SheetRef>(null);
  const categorySheet = useRef<SheetRef>(null);
  const tagSheet = useRef<SheetRef>(null);

  const mainId = mainWalletId(data.wallets);
  const walletsById = useMemo(() => new Map(data.wallets.map((w) => [w.id, w])), [data.wallets]);
  const category = data.categories.find((c) => c.id === values.categoryId);
  const tagsById = useMemo(() => new Map(data.tags.map((t) => [t.id, t])), [data.tags]);
  const transfer = values.type === 'transfer';
  const activeWallets = data.wallets.filter((w) => !w.archived);

  const set = <K extends Path<TransactionInput>>(key: K, value: PathValue<TransactionInput, K>) =>
    setValue(key, value, { shouldDirty: true, shouldValidate: formState.isSubmitted });

  const changeType = (type: TransactionType) => {
    set('type', type);
    if (type === 'transfer') {
      if (!values.toWalletId || values.toWalletId === values.walletId) {
        set('toWalletId', activeWallets.find((w) => w.id !== values.walletId)?.id ?? null);
      }
    } else if (category && category.kind !== type) {
      set('categoryId', null);
    }
  };

  const dateSheet = useRef<SheetRef>(null);
  const pickDate = (picked: Date) => {
    // Keep the original time of day so entries on the same day stay in order.
    const next = new Date(values.occurredAt);
    next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
    set('occurredAt', next);
    // Let the new day's highlight show for a moment before the sheet eases away.
    setTimeout(() => dateSheet.current?.dismiss(), 180);
  };

  const submit = handleSubmit(onSubmit);

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={title}
        right={
          <Menu
            items={TYPE_ITEMS}
            selected={values.type}
            onSelect={changeType}
            accessibilityLabel="Entry type"
            anchor={(open) => (
              <PressableScale
                onPress={open}
                accessibilityRole="button"
                accessibilityLabel={`Entry type: ${TYPE_LABELS[values.type]}. Change`}
                style={styles.typePill}
              >
                <Text variant="label">{TYPE_LABELS[values.type]}</Text>
                <Icon name="chevron-down" weight="bold" size={14} color={lightColors.onSurface} />
              </PressableScale>
            )}
          />
        }
      />

      {/* Scrolls the focused field above the keyboard and the Save bar riding on it. */}
      <KeyboardAwareScrollView
        bottomOffset={FOOTER + spacing.lg}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <AccountCard
          label={transfer ? 'From' : 'Account'}
          wallet={walletsById.get(values.walletId)}
          isMain={values.walletId === mainId}
          onChange={() => fromSheet.current?.present()}
          error={errors.walletId?.message}
        />
        {transfer ? (
          <AccountCard
            label="To"
            wallet={values.toWalletId ? walletsById.get(values.toWalletId) : undefined}
            isMain={values.toWalletId === mainId}
            onChange={() => toSheet.current?.present()}
            error={errors.toWalletId?.message}
            emptyHint={activeWallets.length < 2 ? 'Add another wallet to transfer' : undefined}
          />
        ) : null}

        <AmountField
          label="Amount"
          value={values.amount}
          onChange={(amount) => set('amount', amount)}
          size="xl"
          autoFocus={!onDelete}
          error={errors.amount?.message}
        />

        {transfer ? (
          <AmountField
            label="Fee (optional)"
            value={values.feeAmount}
            onChange={(fee) => set('feeAmount', fee)}
            error={errors.feeAmount?.message}
            accessibilityLabel="Transfer fee"
          />
        ) : (
          <FieldCard
            label="Category"
            error={errors.categoryId?.message}
            onPress={() => categorySheet.current?.present()}
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
            {values.tagIds.map((id) => {
              const tag = tagsById.get(id);
              return tag ? (
                <TagChip
                  key={id}
                  tag={tag}
                  onRemove={() =>
                    set(
                      'tagIds',
                      values.tagIds.filter((t) => t !== id),
                    )
                  }
                />
              ) : null;
            })}
            <Chip
              label="Add tag"
              icon="plus"
              tone="muted"
              onPress={() => tagSheet.current?.present()}
            />
          </View>
        </FieldCard>

        <FieldCard
          label="Date"
          onPress={() => dateSheet.current?.present()}
          accessibilityLabel={`Date: ${format(values.occurredAt, 'd MMMM yyyy')}. Change`}
        >
          <View style={styles.row}>
            <Text variant="subtitle" style={styles.flex}>
              {dateLabel(values.occurredAt)}
            </Text>
            <Icon name="calendar" size={22} color={lightColors.onSurface} />
          </View>
        </FieldCard>

        <TextField
          label="Note"
          value={values.note}
          onChangeText={(note) => set('note', note)}
          placeholder="What was it for?"
          maxLength={200}
          multiline
          error={errors.note?.message}
        />
      </KeyboardAwareScrollView>

      <KeyboardStickyView
        offset={{ closed: 0, opened: insets.bottom }}
        style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}
      >
        {onDelete ? (
          <IconButton
            icon="trash"
            label="Delete entry"
            color={lightColors.expense}
            variant="surface"
            size={54}
            onPress={onDelete}
            disabled={isSubmitting}
          />
        ) : null}
        <Button label="Save" onPress={submit} loading={isSubmitting} style={styles.flex} />
      </KeyboardStickyView>

      <DatePickerSheet
        ref={dateSheet}
        value={values.occurredAt}
        onChange={pickDate}
        maxDate={new Date()}
      />
      <WalletPickerSheet
        ref={fromSheet}
        title={transfer ? 'From wallet' : 'Account'}
        wallets={data.wallets}
        selectedId={values.walletId}
        mainId={mainId}
        onSelect={(id) => {
          set('walletId', id);
          fromSheet.current?.dismiss();
        }}
      />
      <WalletPickerSheet
        ref={toSheet}
        title="To wallet"
        wallets={data.wallets.filter((w) => w.id !== values.walletId)}
        selectedId={values.toWalletId}
        mainId={mainId}
        onSelect={(id) => {
          set('toWalletId', id);
          toSheet.current?.dismiss();
        }}
      />
      <CategoryPickerSheet
        ref={categorySheet}
        categories={data.categories}
        kind={values.type === 'income' ? 'income' : 'expense'}
        selectedId={values.categoryId}
        onSelect={(id) => {
          set('categoryId', id);
          categorySheet.current?.dismiss();
        }}
      />
      <TagPickerSheet
        ref={tagSheet}
        tags={data.tags}
        selectedIds={values.tagIds}
        onAdd={(id) => {
          if (!values.tagIds.includes(id)) set('tagIds', [...values.tagIds, id]);
          tagSheet.current?.dismiss();
        }}
      />
    </View>
  );
}

function dateLabel(date: Date): string {
  const day = format(date, 'd MMM yyyy');
  if (isToday(date)) return `Today, ${day}`;
  if (isYesterday(date)) return `Yesterday, ${day}`;
  return format(date, 'EEEE, d MMM yyyy');
}

interface AccountCardProps {
  label: string;
  wallet: LedgerData['wallets'][number] | undefined;
  isMain: boolean;
  onChange: () => void;
  error?: string;
  emptyHint?: string;
}

/** "Account" row from the Add New inspiration: wallet tile, name, Change button. */
function AccountCard({ label, wallet, isMain, onChange, error, emptyHint }: AccountCardProps) {
  return (
    <FieldCard error={error && !emptyHint ? error : undefined}>
      <View style={styles.row}>
        <IconTile
          icon={wallet?.icon ?? 'wallet'}
          color={wallet?.color ?? lightColors.onSurfaceVariant}
          round
        />
        <View style={styles.flex}>
          <Text variant="caption" tone="muted">
            {label}
          </Text>
          {wallet ? (
            <Text variant="subtitle" numberOfLines={1}>
              {wallet.name}
              {isMain ? (
                <Text variant="body" tone="muted">
                  {' '}
                  (Main wallet)
                </Text>
              ) : null}
            </Text>
          ) : (
            <Text variant="subtitle" tone="muted">
              {emptyHint ?? 'Choose a wallet'}
            </Text>
          )}
        </View>
        {emptyHint ? (
          <Button
            label="Add wallet"
            variant="secondary"
            size="sm"
            onPress={() => router.push('/wallets/new')}
          />
        ) : (
          <Button label="Change" variant="secondary" size="sm" onPress={onChange} />
        )}
      </View>
    </FieldCard>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.background },
  content: { paddingHorizontal: spacing.gutter, paddingBottom: spacing.xxl, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    height: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: lightColors.surface,
    boxShadow: shadow.card,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
    backgroundColor: lightColors.background,
  },
});
