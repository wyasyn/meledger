import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
  useBottomSheetModal,
  useBottomSheetTimingConfigs,
} from '@gorhom/bottom-sheet';
import { addMonths, startOfDay } from 'date-fns';
import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/IconButton';
import { ListGroup, ListRow } from '@/components/ui/ListGroup';
import { Text } from '@/components/ui/Text';
import { useSheetBackHandler } from '@/components/ui/useSheetBackHandler';
import { useLedgerData } from '@/features/transactions/useLedgerData';
import { mainWalletId } from '@/features/wallets/logic';
import { lightColors, radius, spacing } from '@/theme/tokens';

import { type PlanKind, useAddPlanSheet } from '../addSheet';
import { createBudget, createDebt, createGoal, createRecurring, createSavingsGroup } from '../repo';
import { usePlanData } from '../usePlanData';
import { BillForm } from './BillForm';
import { BudgetForm } from './BudgetForm';
import { DebtForm } from './DebtForm';
import { InSheetContext } from './FormScreen';
import { GoalForm } from './GoalForm';
import { GroupForm } from './GroupForm';

const KINDS: {
  kind: PlanKind;
  title: string;
  label: string;
  hint: string;
  icon: string;
  color: string;
}[] = [
  {
    kind: 'goal',
    title: 'New goal',
    label: 'Goal',
    hint: 'Save towards something',
    icon: 'target',
    color: 'blue',
  },
  {
    kind: 'budget',
    title: 'New budget',
    label: 'Budget',
    hint: 'Set a spending limit',
    icon: 'report',
    color: 'green',
  },
  {
    kind: 'bill',
    title: 'New recurring bill',
    label: 'Recurring bill',
    hint: 'Get reminded when it is due',
    icon: 'repeat',
    color: 'lime',
  },
  {
    kind: 'debt',
    title: 'New debt or loan',
    label: 'Debt or loan',
    hint: 'Money lent or borrowed',
    icon: 'debt',
    color: 'amber',
  },
  {
    kind: 'group',
    title: 'New savings group',
    label: 'Savings group',
    hint: 'SACCO, VSLA or chama',
    icon: 'group',
    color: 'teal',
  },
];

/**
 * Mounted once in the root layout. openAddPlan() opens it at the list of what can be added;
 * openAddPlan(kind) opens straight at that form. The list sizes to its content; a form opens at
 * full height and scrolls.
 */
export function AddPlanSheetHost() {
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);
  const requestId = useAddPlanSheet((s) => s.requestId);
  // The list sizes to its content; a form opens at full height and scrolls.
  const onForm = useAddPlanSheet((s) => s.kind !== null);
  const back = useSheetBackHandler(ref);

  useEffect(() => {
    if (requestId > 0) ref.current?.present();
  }, [requestId]);

  // The same eased open and close as the other sheets: no bounce.
  const animationConfigs = useBottomSheetTimingConfigs({
    duration: 420,
    easing: Easing.inOut(Easing.cubic),
  });
  const backdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.32}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      name="add-plan"
      enableDynamicSizing={!onForm}
      snapPoints={onForm ? ['100%'] : undefined}
      backdropComponent={backdrop}
      animationConfigs={animationConfigs}
      onChange={back.onChange}
      onDismiss={() => {
        back.onDismiss();
        useAddPlanSheet.getState().show(null);
      }}
      // Pickers opened from the forms stack on top of this sheet.
      stackBehavior="push"
      topInset={insets.top + spacing.sm}
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
    >
      <AddPlanPanel />
    </BottomSheetModal>
  );
}

/** Mounted only while the sheet is open, so each open starts fresh and loads data then. */
function AddPlanPanel() {
  const insets = useSafeAreaInsets();
  const { dismiss } = useBottomSheetModal();
  const kind = useAddPlanSheet((s) => s.kind);
  const setKind = useAddPlanSheet((s) => s.show);
  const close = () => dismiss('add-plan');
  const current = KINDS.find((k) => k.kind === kind);

  const header = (
    <View style={styles.header}>
      <Text variant="title" accessibilityRole="header" style={styles.flex}>
        {current?.title ?? 'Add to your plan'}
      </Text>
      <IconButton icon="close" label="Close" variant="surface" size={36} onPress={close} />
    </View>
  );

  if (!kind) {
    return (
      <BottomSheetView style={{ paddingBottom: insets.bottom + spacing.lg }}>
        {header}
        <View style={styles.list}>
          <ListGroup>
            {KINDS.map((k) => (
              <ListRow
                key={k.kind}
                title={k.label}
                subtitle={k.hint}
                icon={k.icon}
                iconColor={k.color}
                onPress={() => setKind(k.kind)}
              />
            ))}
          </ListGroup>
        </View>
      </BottomSheetView>
    );
  }

  return (
    <InSheetContext value={{ header }}>
      <KindForm kind={kind} onSaved={close} />
    </InSheetContext>
  );
}

function KindForm({ kind, onSaved }: { kind: PlanKind; onSaved: () => void }) {
  const data = useLedgerData();
  const plan = usePlanData();
  if (!data || !plan) return null;
  const title = KINDS.find((k) => k.kind === kind)!.title;

  switch (kind) {
    case 'goal':
      return (
        <GoalForm
          title={title}
          autoFocus
          initial={{
            name: '',
            icon: 'piggy-bank',
            color: 'teal',
            targetAmount: 0,
            targetDate: null,
          }}
          onSubmit={async (values) => {
            await createGoal(values);
            onSaved();
          }}
        />
      );
    case 'budget':
      return (
        <BudgetForm
          title={title}
          categories={data.categories}
          initial={{
            categoryId: '',
            period: 'monthly',
            limitAmount: 0,
            alertAt: 80,
            startsAt: null,
            endsAt: null,
          }}
          onSubmit={async (values) => {
            await createBudget(values);
            onSaved();
          }}
        />
      );
    case 'bill':
      return (
        <BillForm
          title={title}
          autoFocus
          categories={data.categories}
          wallets={data.wallets}
          initial={{
            name: '',
            type: 'expense',
            amount: 0,
            walletId: mainWalletId(data.wallets) ?? '',
            categoryId: null,
            frequency: 'monthly',
            nextDueAt: addMonths(startOfDay(new Date()), 1),
          }}
          onSubmit={async (values) => {
            await createRecurring(values);
            onSaved();
          }}
        />
      );
    case 'debt':
      return (
        <DebtForm
          title={title}
          autoFocus
          people={[...new Set(plan.debts.map((d) => d.person))]}
          wallets={data.wallets}
          initial={{
            person: '',
            direction: 'owed_to_me',
            principal: 0,
            startedAt: new Date(),
            dueAt: null,
            note: '',
            walletId: mainWalletId(data.wallets),
          }}
          onSubmit={async (values) => {
            await createDebt(values);
            onSaved();
          }}
        />
      );
    case 'group':
      return (
        <GroupForm
          title={title}
          autoFocus
          initial={{
            name: '',
            contributionAmount: 0,
            frequency: 'weekly',
            members: [],
            payoutTurn: null,
            cycleStart: startOfDay(new Date()),
          }}
          onSubmit={async (values) => {
            await createSavingsGroup(values);
            onSaved();
          }}
        />
      );
  }
}

const styles = StyleSheet.create({
  background: { backgroundColor: lightColors.background, borderRadius: radius.sheet },
  handle: { backgroundColor: '#D4D4D8', width: 36, height: 5 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  flex: { flex: 1 },
  list: { paddingHorizontal: spacing.gutter },
});
