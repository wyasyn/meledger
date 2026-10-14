import { TransactionInputSchema } from '@meledger/shared';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { DatePickerSheet } from '@/components/ui/DatePickerSheet';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import type { SheetRef } from '@/components/ui/Sheet';
import { SheetKeyboardScrollView } from '@/components/ui/SheetKeyboardScrollView';
import { Text } from '@/components/ui/Text';
import { showSnackbar } from '@/features/feedback/snackbar';
import { CategoryPickerSheet } from '@/features/transactions/components/CategoryPickerSheet';
import { TagPickerSheet } from '@/features/transactions/components/TagPickerSheet';
import { WalletPickerSheet } from '@/features/transactions/components/WalletPickerSheet';
import {
  createTransaction,
  deleteTransaction,
  restoreTransaction,
  updateTransaction,
} from '@/features/transactions/repo';
import type { LedgerData } from '@/features/transactions/useLedgerData';
import { mainWalletId } from '@/features/wallets/logic';
import { lightColors, radius, spacing } from '@/theme/tokens';

import { learningsFor, type VoiceDraft } from '../logic';
import { learn } from '../vocabulary';
import { ConfirmationCard, type DraftErrors, type PickerField } from './ConfirmationCard';

/** Height of the pinned Save all bar, so focused fields scroll clear of it. */
const FOOTER = 86;

interface VoiceReviewProps {
  /** What was said; empty for a typed or edited entry. */
  transcript: string;
  /**
   * `voice`: parsed from speech (saved with the transcript, corrections are learned).
   * `typed`: the keyboard button (a keyboard entry). `edit`: the existing entry `editId`.
   */
  mode: 'voice' | 'typed' | 'edit';
  editId?: string;
  drafts: VoiceDraft[];
  data: LedgerData;
  onDrafts: (drafts: VoiceDraft[]) => void;
  /** Moves the Save bar with the sheet's visible bottom edge while it is dragged. */
  footerStyle?: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;
  /** Fixed spacer at the end of the list (room for the lower sheet height). */
  spacerStyle?: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;
  /** Called after saving or discarding; the sheet closes. */
  onDone: () => void;
}

function errorsFor(draft: VoiceDraft): DraftErrors {
  const result = TransactionInputSchema.safeParse(draft.input);
  if (result.success) return {};
  const errors: DraftErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof DraftErrors;
    errors[key] ??= issue.message;
  }
  return errors;
}

/** The confirmation cards for what was said, with Save all and Discard (build prompt section 5.2). */
export function VoiceReview({
  transcript,
  mode,
  editId,
  drafts,
  data,
  onDrafts,
  onDone,
  footerStyle,
  spacerStyle,
}: VoiceReviewProps) {
  const insets = useSafeAreaInsets();
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);
  const walletSheet = useRef<SheetRef>(null);
  const toWalletSheet = useRef<SheetRef>(null);
  const categorySheet = useRef<SheetRef>(null);
  const tagSheet = useRef<SheetRef>(null);
  const dateSheet = useRef<SheetRef>(null);

  const mainId = mainWalletId(data.wallets);
  const active = drafts.find((d) => d.key === picking);
  const savable = drafts.filter((d) => d.savable);

  const update = (next: VoiceDraft) => onDrafts(drafts.map((d) => (d.key === next.key ? next : d)));
  const patchActive = (patch: Partial<VoiceDraft['input']>) => {
    if (active) update({ ...active, input: { ...active.input, ...patch } });
  };

  const pick = (key: string, field: PickerField) => {
    setPicking(key);
    const sheet = {
      wallet: walletSheet,
      toWallet: toWalletSheet,
      category: categorySheet,
      tag: tagSheet,
      date: dateSheet,
    }[field];
    sheet.current?.present();
  };

  const remove = (key: string) => {
    const next = drafts.filter((d) => d.key !== key);
    if (next.length === 0) onDone();
    else onDrafts(next);
  };

  const saveAll = async () => {
    if (savable.some((d) => Object.keys(errorsFor(d)).length > 0)) {
      setShowErrors(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setSaving(true);
    if (mode === 'edit' && editId && savable[0]) {
      await updateTransaction(editId, savable[0].input);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSnackbar({ message: 'Entry updated' });
      onDone();
      return;
    }
    const ids: string[] = [];
    for (const d of savable) {
      const c = d.parsed.confidence;
      const confidence = Math.min(c.amount, c.type, c.wallet, c.category, c.date);
      ids.push(
        mode === 'typed'
          ? await createTransaction(d.input, 'keyboard')
          : await createTransaction(d.input, 'voice', { transcript, confidence }),
      );
    }
    if (mode === 'voice') await learn(savable.flatMap(learningsFor));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showSnackbar({
      message: ids.length === 1 ? 'Saved 1 entry' : `Saved ${ids.length} entries`,
      duration: 5000,
      action: {
        label: 'Undo',
        onPress: () => {
          for (const id of ids) deleteTransaction(id);
        },
      },
    });
    onDone();
  };

  const deleteEntry = async () => {
    if (!editId) return;
    await deleteTransaction(editId);
    showSnackbar({
      message: 'Entry deleted',
      duration: 5000,
      action: { label: 'Undo', onPress: () => void restoreTransaction(editId) },
    });
    onDone();
  };

  return (
    <View style={styles.root}>
      <SheetKeyboardScrollView
        bottomOffset={FOOTER + spacing.lg}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: FOOTER + insets.bottom + spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {transcript ? (
          <View style={styles.said}>
            <Icon name="mic" weight="fill" size={16} color={lightColors.primary} />
            <Text variant="body" style={styles.flex} numberOfLines={3}>
              {transcript}
            </Text>
          </View>
        ) : null}
        {drafts.map((d, i) => (
          <ConfirmationCard
            key={d.key}
            draft={d}
            index={i}
            total={drafts.length}
            data={data}
            mainId={mainId}
            errors={showErrors ? errorsFor(d) : {}}
            onChange={update}
            onRemove={() => remove(d.key)}
            onPick={(field) => pick(d.key, field)}
            autoFocusAmount={mode === 'typed'}
            title={mode === 'edit' ? 'Edit entry' : undefined}
          />
        ))}
        <Animated.View style={spacerStyle} />
      </SheetKeyboardScrollView>

      <Animated.View style={[styles.footerDock, footerStyle]}>
        <KeyboardStickyView
          offset={{ closed: 0, opened: insets.bottom }}
          style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}
        >
          {mode === 'edit' ? (
            <IconButton
              icon="trash"
              label="Delete entry"
              color={lightColors.expense}
              variant="surface"
              size={54}
              onPress={deleteEntry}
              disabled={saving}
            />
          ) : (
            <Button
              label="Discard"
              variant="secondary"
              onPress={onDone}
              disabled={saving}
              style={styles.flex}
            />
          )}
          <Button
            label={savable.length > 1 ? 'Save all' : 'Save'}
            onPress={saveAll}
            loading={saving}
            disabled={savable.length === 0}
            style={styles.grow}
          />
        </KeyboardStickyView>
      </Animated.View>

      <WalletPickerSheet
        ref={walletSheet}
        title={active?.input.type === 'transfer' ? 'From wallet' : 'Account'}
        wallets={data.wallets}
        selectedId={active?.input.walletId ?? null}
        mainId={mainId}
        onSelect={(walletId) => {
          patchActive({ walletId });
          walletSheet.current?.dismiss();
        }}
      />
      <WalletPickerSheet
        ref={toWalletSheet}
        title="To wallet"
        wallets={data.wallets.filter((w) => w.id !== active?.input.walletId)}
        selectedId={active?.input.toWalletId ?? null}
        mainId={mainId}
        onSelect={(toWalletId) => {
          patchActive({ toWalletId });
          toWalletSheet.current?.dismiss();
        }}
      />
      <CategoryPickerSheet
        ref={categorySheet}
        categories={data.categories}
        kind={active?.input.type === 'income' ? 'income' : 'expense'}
        selectedId={active?.input.categoryId ?? null}
        onSelect={(categoryId) => {
          patchActive({ categoryId });
          categorySheet.current?.dismiss();
        }}
      />
      <TagPickerSheet
        ref={tagSheet}
        tags={data.tags}
        selectedIds={active?.input.tagIds ?? []}
        onAdd={(id) => {
          if (active && !active.input.tagIds.includes(id))
            patchActive({ tagIds: [...active.input.tagIds, id] });
          tagSheet.current?.dismiss();
        }}
      />
      <DatePickerSheet
        ref={dateSheet}
        value={active?.input.occurredAt ?? new Date()}
        onChange={(picked) => {
          if (!active) return;
          // Keep the time of day so entries on the same day stay in order.
          const next = new Date(active.input.occurredAt);
          next.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
          patchActive({ occurredAt: next });
          setTimeout(() => dateSheet.current?.dismiss(), 180);
        }}
        maxDate={new Date()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: spacing.gutter, gap: spacing.lg },
  said: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.field,
    backgroundColor: lightColors.primaryContainer,
  },
  flex: { flex: 1 },
  grow: { flex: 2 },
  footerDock: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
    backgroundColor: lightColors.background,
  },
});
