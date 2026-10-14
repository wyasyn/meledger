import { zodResolver } from '@hookform/resolvers/zod';
import {
  formatAmount,
  type TransactionInput,
  TransactionInputSchema,
  type TransactionType,
} from '@meledger/shared';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { format, isToday, isYesterday } from 'date-fns';
import { Link } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { type Path, type PathValue, useForm, useWatch } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button, HelperText, Menu, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { FieldCard } from '@/components/ui/FieldCard';
import { IconTile } from '@/components/ui/IconTile';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import type { SheetRef } from '@/components/ui/Sheet';
import { mainWalletId } from '@/features/wallets/logic';
import { fontFamily } from '@/theme/fonts';
import { lightColors, radius, spacing } from '@/theme/tokens';

import { parseAmountInput } from '../logic';
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

  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
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
    setTypeMenuOpen(false);
    set('type', type);
    if (type === 'transfer') {
      if (!values.toWalletId || values.toWalletId === values.walletId) {
        set('toWalletId', activeWallets.find((w) => w.id !== values.walletId)?.id ?? null);
      }
    } else if (category && category.kind !== type) {
      set('categoryId', null);
    }
  };

  const openDatePicker = () => {
    DateTimePickerAndroid.open({
      value: values.occurredAt,
      mode: 'date',
      maximumDate: new Date(),
      onValueChange: (_event, picked) => {
        // Keep the original time of day so entries on the same day stay in order.
        const next = new Date(values.occurredAt);
        next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
        set('occurredAt', next);
      },
    });
  };

  const submit = handleSubmit(onSubmit);

  return (
    <View style={styles.root}>
      <ScreenHeader
        title={title}
        right={
          <Menu
            visible={typeMenuOpen}
            onDismiss={() => setTypeMenuOpen(false)}
            anchorPosition="bottom"
            anchor={
              <Pressable
                onPress={() => setTypeMenuOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={`Entry type: ${TYPE_LABELS[values.type]}. Change`}
                style={styles.typePill}
              >
                <Text variant="labelLarge">{TYPE_LABELS[values.type]}</Text>
                <Icon name="chevron-down" size={18} color={lightColors.onSurface} />
              </Pressable>
            }
          >
            {(Object.keys(TYPE_LABELS) as TransactionType[]).map((type) => (
              <Menu.Item
                key={type}
                title={TYPE_LABELS[type]}
                onPress={() => changeType(type)}
                leadingIcon={type === values.type ? 'check' : undefined}
              />
            ))}
          </Menu>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
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

        <FieldCard label="Amount" error={errors.amount?.message}>
          <AmountInput
            value={values.amount}
            onChange={(amount) => set('amount', amount)}
            large
            autoFocus={!onDelete}
            accessibilityLabel="Amount"
          />
        </FieldCard>

        {transfer ? (
          <FieldCard label="Fee (optional)" error={errors.feeAmount?.message}>
            <AmountInput
              value={values.feeAmount}
              onChange={(fee) => set('feeAmount', fee)}
              accessibilityLabel="Transfer fee"
            />
          </FieldCard>
        ) : (
          <FieldCard
            label="Category"
            error={errors.categoryId?.message}
            onPress={() => categorySheet.current?.present()}
            accessibilityLabel={`Category: ${category?.name ?? 'none'}. Change`}
          >
            <View style={styles.row}>
              {category ? (
                <IconTile icon={category.icon} color={category.color} size={36} />
              ) : (
                <IconTile icon="shape-outline" color={lightColors.onSurfaceVariant} size={36} />
              )}
              <Text variant="titleMedium" style={styles.flex}>
                {category?.name ?? 'Choose a category'}
              </Text>
              <Icon name="chevron-right" size={22} color={lightColors.onSurfaceVariant} />
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
            <Pressable
              onPress={() => tagSheet.current?.present()}
              accessibilityRole="button"
              accessibilityLabel="Add tag"
              style={styles.addTag}
            >
              <Icon name="plus" size={16} color={lightColors.onSurfaceVariant} />
              <Text variant="labelLarge" style={styles.muted}>
                Add tag
              </Text>
            </Pressable>
          </View>
        </FieldCard>

        <FieldCard label="Date">
          <Pressable
            onPress={openDatePicker}
            accessibilityRole="button"
            accessibilityLabel={`Date: ${format(values.occurredAt, 'd MMMM yyyy')}. Change`}
            style={styles.dateBox}
          >
            <Text variant="titleMedium" style={styles.flex}>
              {dateLabel(values.occurredAt)}
            </Text>
            <Icon name="calendar-month-outline" size={22} color={lightColors.onSurface} />
          </Pressable>
        </FieldCard>

        <FieldCard label="Note" error={errors.note?.message}>
          <TextInput
            value={values.note}
            onChangeText={(note) => set('note', note)}
            placeholder="What was it for?"
            placeholderTextColor={lightColors.onSurfaceVariant}
            maxLength={200}
            multiline
            accessibilityLabel="Note"
            style={styles.note}
          />
        </FieldCard>

        <View style={styles.actions}>
          {onDelete ? (
            <Button
              mode="text"
              icon="delete-outline"
              textColor={lightColors.expense}
              onPress={onDelete}
              disabled={isSubmitting}
            >
              Delete
            </Button>
          ) : null}
          <Button
            mode="contained"
            onPress={submit}
            loading={isSubmitting}
            disabled={isSubmitting}
            style={styles.save}
            contentStyle={styles.saveContent}
          >
            Save
          </Button>
        </View>
      </ScrollView>

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
  const day = format(date, 'dd/MM/yyyy');
  if (isToday(date)) return `Today, ${day}`;
  if (isYesterday(date)) return `Yesterday, ${day}`;
  return day;
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
    <FieldCard error={wallet ? error : undefined}>
      <View style={styles.row}>
        <IconTile
          icon={wallet?.icon ?? 'wallet-outline'}
          color={wallet?.color ?? lightColors.onSurfaceVariant}
          round
        />
        <View style={styles.flex}>
          <Text variant="bodyMedium" style={styles.muted}>
            {label}
          </Text>
          {wallet ? (
            <Text variant="titleMedium">
              {wallet.name}
              {isMain ? <Text style={styles.muted}> (Main wallet)</Text> : null}
            </Text>
          ) : (
            <Text variant="titleMedium" style={styles.muted}>
              {emptyHint ?? 'Choose a wallet'}
            </Text>
          )}
        </View>
        {emptyHint ? (
          <Link href="/wallets/new" asChild>
            <Button mode="contained-tonal" compact>
              Add wallet
            </Button>
          </Link>
        ) : (
          <Button mode="contained-tonal" compact onPress={onChange}>
            Change
          </Button>
        )}
      </View>
      {!wallet && error && !emptyHint ? (
        <HelperText type="error" padding="none">
          {error}
        </HelperText>
      ) : null}
    </FieldCard>
  );
}

interface AmountInputProps {
  value: number;
  onChange: (value: number) => void;
  large?: boolean;
  autoFocus?: boolean;
  accessibilityLabel: string;
}

/** Whole-shilling amount with live thousands separators and a grey "UGX" prefix. */
export function AmountInput({
  value,
  onChange,
  large = false,
  autoFocus = false,
  accessibilityLabel,
}: AmountInputProps) {
  return (
    <View style={styles.amountRow}>
      <Text variant={large ? 'headlineSmall' : 'titleMedium'} style={styles.muted}>
        UGX
      </Text>
      <TextInput
        value={value ? formatAmount(value, 'UGX') : ''}
        onChangeText={(text) => onChange(parseAmountInput(text))}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={lightColors.outline}
        autoFocus={autoFocus}
        accessibilityLabel={accessibilityLabel}
        style={[styles.amountInput, large ? styles.amountLarge : styles.amountSmall]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.background },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  muted: { color: lightColors.onSurfaceVariant },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: lightColors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  addTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: lightColors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: lightColors.background,
    borderRadius: radius.small,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  note: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    color: lightColors.onSurface,
    padding: 0,
    minHeight: 24,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  amountInput: { flex: 1, padding: 0, color: lightColors.onSurface },
  amountLarge: { fontFamily: fontFamily.semibold, fontSize: 40, lineHeight: 48 },
  amountSmall: { fontFamily: fontFamily.semibold, fontSize: 20, lineHeight: 28 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  save: { flex: 1, borderRadius: radius.pill },
  saveContent: { height: 52 },
});
