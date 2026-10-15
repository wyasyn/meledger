import { formatMoney, type ParseIntent, type ParsedCommand } from '@meledger/shared';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { KeyboardStickyView } from 'react-native-keyboard-controller';
import Animated, { type AnimatedStyle, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountField } from '@/components/ui/AmountField';
import { Button } from '@/components/ui/Button';
import { Chip, ChipGroup } from '@/components/ui/Chip';
import { FieldCard } from '@/components/ui/FieldCard';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { IconTile } from '@/components/ui/IconTile';
import type { SheetRef } from '@/components/ui/Sheet';
import { SheetKeyboardScrollView } from '@/components/ui/SheetKeyboardScrollView';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { showSnackbar } from '@/features/feedback/snackbar';
import { DateField } from '@/features/plan/components/DateField';
import {
  addContribution,
  createGoal,
  deleteContribution,
  deleteGoal,
  setCategoryBudget,
} from '@/features/plan/repo';
import { usePlanData } from '@/features/plan/usePlanData';
import { CategoryPickerSheet } from '@/features/transactions/components/CategoryPickerSheet';
import type { LedgerData } from '@/features/transactions/useLedgerData';
import { lightColors, radius, spacing } from '@/theme/tokens';

import { matchGoal } from '../logic';

/** Height of the pinned button bar, so focused fields scroll clear of it. */
const FOOTER = 86;

export type CommandIntent = Extract<ParseIntent, 'set_budget' | 'set_goal' | 'contribute_goal'>;

interface CommandReviewProps {
  intent: CommandIntent;
  command: ParsedCommand;
  transcript: string;
  data: LedgerData;
  footerStyle?: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;
  spacerStyle?: StyleProp<AnimatedStyle<StyleProp<ViewStyle>>>;
  onDone: () => void;
}

const TITLES: Record<CommandIntent, string> = {
  set_budget: 'Set a budget',
  set_goal: 'New goal',
  contribute_goal: 'Add to a goal',
};

const parseDay = (iso: string | null) => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
};

/**
 * Confirmation card for a spoken command (build prompt section 5.2): set a category budget,
 * create a goal, or put money towards one. Everything heard is filled in and can be changed.
 */
export function CommandReview({
  intent,
  command,
  transcript,
  data,
  footerStyle,
  spacerStyle,
  onDone,
}: CommandReviewProps) {
  const insets = useSafeAreaInsets();
  const plan = usePlanData();
  const goals = plan?.goals.filter((g) => g.status === 'active') ?? [];
  const usd = command.currency === 'USD';
  const [amount, setAmount] = useState(usd ? 0 : (command.amount ?? 0));
  const [categoryId, setCategoryId] = useState(command.categoryId);
  const [name, setName] = useState(command.text);
  const [targetDate, setTargetDate] = useState<Date | null>(parseDay(command.date));
  const [goalId, setGoalId] = useState<string | null>(null);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const categorySheet = useRef<SheetRef>(null);

  const category = data.categories.find((c) => c.id === categoryId);
  // Until the user picks one, the goal is the one the words point to.
  const goal = goals.find((g) => g.id === goalId) ?? matchGoal(command.text, goals);
  const existingBudget = plan?.budgets.find(
    (b) => b.categoryId === categoryId && b.period === 'monthly',
  );

  const save = async () => {
    if (amount <= 0) return setError('Enter an amount');
    if (intent === 'set_budget' && !categoryId) return setError('Choose a category');
    if (intent === 'set_goal' && !name.trim()) return setError('Name your goal');
    if (intent === 'contribute_goal' && !goal) return setError('Choose a goal');
    setSaving(true);
    if (intent === 'set_budget' && categoryId) {
      await setCategoryBudget(categoryId, amount);
      showSnackbar({
        message: `${category?.name ?? 'Budget'} set to ${formatMoney(amount)} a month`,
        action: { label: 'View', onPress: () => router.navigate('/plan') },
      });
    } else if (intent === 'set_goal') {
      const id = await createGoal({
        name: name.trim().slice(0, 40),
        icon: 'piggy-bank',
        color: 'teal',
        targetAmount: amount,
        targetDate,
      });
      showSnackbar({
        message: `Goal "${name.trim()}" created`,
        duration: 5000,
        action: { label: 'Undo', onPress: () => void deleteGoal(id) },
      });
    } else if (goal) {
      const id = await addContribution(goal.id, { amount, occurredAt: new Date() });
      showSnackbar({
        message: `Added ${formatMoney(amount)} to ${goal.name}`,
        duration: 5000,
        action: { label: 'Undo', onPress: () => void deleteContribution(id) },
      });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onDone();
  };

  const noGoals = intent === 'contribute_goal' && plan !== undefined && goals.length === 0;

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
        <View style={styles.said}>
          <Icon name="mic" weight="fill" size={16} color={lightColors.primary} />
          <Text variant="body" style={styles.flex} numberOfLines={3}>
            {transcript}
          </Text>
        </View>

        <Animated.View entering={FadeInDown.duration(260)} style={styles.card}>
          <View style={styles.header}>
            <Text variant="label" tone="muted" style={styles.flex}>
              {TITLES[intent]}
            </Text>
            <IconButton icon="close" label="Close" variant="surface" size={36} onPress={onDone} />
          </View>

          {intent === 'set_budget' ? (
            <FieldCard
              label="Category"
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
          ) : null}

          {intent === 'set_goal' ? (
            <TextField
              label="Goal"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Laptop"
              maxLength={40}
            />
          ) : null}

          {intent === 'contribute_goal' ? (
            noGoals ? (
              <FieldCard>
                <Text variant="subtitle">You have no goals yet</Text>
                <Text variant="caption" tone="muted">
                  Create one first, then add money to it.
                </Text>
              </FieldCard>
            ) : (
              <FieldCard label="Goal">
                <ChipGroup>
                  {goals.map((g) => (
                    <Chip
                      key={g.id}
                      label={g.name}
                      icon={g.icon}
                      tone="muted"
                      selected={g.id === goal?.id}
                      onPress={() => setGoalId(g.id)}
                    />
                  ))}
                </ChipGroup>
              </FieldCard>
            )
          ) : null}

          <AmountField
            label={
              intent === 'set_budget'
                ? 'Monthly limit'
                : intent === 'set_goal'
                  ? 'Target'
                  : 'Amount'
            }
            value={amount}
            onChange={(v) => {
              setAmount(v);
              setError(undefined);
            }}
            size="xl"
            error={error}
            attention={usd && amount === 0 ? 'Heard dollars. Enter it in UGX.' : undefined}
          />

          {intent === 'set_goal' ? (
            <DateField
              label="Target date"
              value={targetDate}
              onChange={setTargetDate}
              emptyLabel="No target date"
            />
          ) : null}

          {intent === 'set_budget' && existingBudget ? (
            <Text variant="caption" tone="muted">
              Replaces the current limit of {formatMoney(existingBudget.limitAmount)} a month.
            </Text>
          ) : null}
        </Animated.View>
        <Animated.View style={spacerStyle} />
      </SheetKeyboardScrollView>

      <Animated.View style={[styles.footerDock, footerStyle]}>
        <KeyboardStickyView
          offset={{ closed: 0, opened: insets.bottom }}
          style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}
        >
          <Button label="Discard" variant="secondary" onPress={onDone} style={styles.flex} />
          {noGoals ? (
            <Button
              label="Create a goal"
              onPress={() => {
                onDone();
                router.push('/goals/new');
              }}
              style={styles.grow}
            />
          ) : (
            <Button label="Save" onPress={save} loading={saving} style={styles.grow} />
          )}
        </KeyboardStickyView>
      </Animated.View>

      <CategoryPickerSheet
        ref={categorySheet}
        categories={data.categories}
        kind="expense"
        selectedId={categoryId}
        onSelect={(id) => {
          setCategoryId(id);
          setError(undefined);
          categorySheet.current?.dismiss();
        }}
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
  card: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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
