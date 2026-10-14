import { formatAmount } from '@meledger/shared';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { showSnackbar } from '@/features/feedback/snackbar';
import { lightColors, radius, shadow, spacing } from '@/theme/tokens';

interface MoneyCardsProps {
  /** Readable period, e.g. "October 2026" or "12 to 18 Oct 2026". */
  periodLabel: string;
  income: number;
  expense: number;
}

/** "Your Money": income and expenses for the selected period. */
export function MoneyCards({ periodLabel, income, expense }: MoneyCardsProps) {
  return (
    <View style={styles.root}>
      <SectionHeader
        title="Your Money"
        action={{ label: 'Details', onPress: () => router.navigate('/report') }}
      />
      <View style={styles.cards}>
        <MoneyCard
          label="Income"
          icon="income"
          color={lightColors.income}
          container={lightColors.incomeContainer}
          amount={income}
          info={`Money received during ${periodLabel}, across all wallets.`}
        />
        <MoneyCard
          label="Expenses"
          icon="expense"
          color={lightColors.expense}
          container={lightColors.expenseContainer}
          amount={expense}
          info={`Money spent during ${periodLabel}, including transfer fees.`}
        />
      </View>
    </View>
  );
}

interface MoneyCardProps {
  label: string;
  icon: IconName;
  color: string;
  container: string;
  amount: number;
  info: string;
}

function MoneyCard({ label, icon, color, container, amount, info }: MoneyCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.tile, { backgroundColor: container }]}>
        <Icon name={icon} weight="bold" size={20} color={color} />
      </View>
      <PressableScale
        onPress={() => showSnackbar({ message: info })}
        accessibilityRole="button"
        accessibilityLabel={`${label}: what this means`}
        style={styles.labelRow}
      >
        <Text variant="caption" tone="muted">
          {label}
        </Text>
        <Icon name="info" size={14} color={lightColors.onSurfaceVariant} />
      </PressableScale>
      <View
        style={styles.amountRow}
        accessible
        accessibilityLabel={`${label} UGX ${formatAmount(amount, 'UGX')}`}
      >
        <Text variant="caption" tone="muted">
          UGX
        </Text>
        <Text variant="amount" numberOfLines={1} adjustsFontSizeToFit style={styles.flex}>
          {formatAmount(amount, 'UGX')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  cards: { flexDirection: 'row', gap: spacing.md },
  card: {
    flex: 1,
    backgroundColor: lightColors.surface,
    borderRadius: radius.card,
    padding: spacing.lg + 2,
    gap: spacing.xs,
    boxShadow: shadow.card,
  },
  tile: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  flex: { flex: 1 },
});
