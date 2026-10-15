import { formatMoney } from '@meledger/shared';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/ui/IconButton';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ProgressRing } from '@/components/ui/Progress';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { PlanRow } from '@/features/plan/components/PlanRow';
import { budgetPeriodLabel, budgetStatus } from '@/features/plan/logic';
import { usePlanData, usePlanTransactions } from '@/features/plan/usePlanData';
import { useLedgerData } from '@/features/transactions/useLedgerData';
import { openAddPlan } from '@/features/plan/addSheet';
import { lightColors, paletteColor, spacing } from '@/theme/tokens';

/** Every budget (View all on the Plan tab). */
export default function BudgetsScreen() {
  const insets = useSafeAreaInsets();
  const plan = usePlanData();
  const data = useLedgerData();
  const transactions = usePlanTransactions(data);
  if (!plan || !data) return <LoadingScreen />;
  const now = new Date();
  const categories = new Map(data.categories.map((c) => [c.id, c]));

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Budgets"
        right={
          <IconButton
            icon="plus"
            label="Add budget"
            variant="dark"
            onPress={() => openAddPlan('budget')}
          />
        }
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
      >
        {plan.budgets.map((budget) => {
          const category = categories.get(budget.categoryId);
          const status = budgetStatus(budget, transactions, now);
          return (
            <PlanRow
              key={budget.id}
              icon={category?.icon ?? 'category'}
              color={category?.color ?? 'slate'}
              title={category?.name ?? 'Category'}
              detail={`${formatMoney(status.spent)} of ${formatMoney(status.limit)}`}
              caption={budgetPeriodLabel(budget, now)}
              trailing={
                <ProgressRing
                  value={status.ratio}
                  size={52}
                  color={
                    status.state === 'over'
                      ? lightColors.expense
                      : paletteColor(category?.color ?? 'slate')
                  }
                />
              }
              onPress={() => router.push({ pathname: '/budgets/[id]', params: { id: budget.id } })}
              accessibilityLabel={`${category?.name ?? 'Budget'}: ${formatMoney(status.spent)} of ${formatMoney(status.limit)}`}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.background },
  content: { paddingHorizontal: spacing.gutter, gap: spacing.md },
});
