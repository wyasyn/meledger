import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatAmount } from '@meledger/shared';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { showSnackbar } from '@/features/feedback/snackbar';
import { fontFamily } from '@/theme/fonts';
import { lightColors, radius, spacing } from '@/theme/tokens';

interface MoneyCardsProps {
  month: Date;
  income: number;
  expense: number;
}

/** "Your Money": income and expenses for the selected month. */
export function MoneyCards({ month, income, expense }: MoneyCardsProps) {
  const monthName = format(month, 'MMMM');
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text variant="titleMedium">Your Money</Text>
        <Pressable
          onPress={() => router.navigate('/report')}
          accessibilityRole="button"
          style={styles.details}
        >
          <Text variant="labelMedium">Details</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color={lightColors.onSurface} />
        </Pressable>
      </View>
      <View style={styles.cards}>
        <MoneyCard
          label="Income"
          icon="cash-plus"
          color={lightColors.income}
          container={lightColors.incomeContainer}
          amount={income}
          info={`Money received in ${monthName}, across all wallets.`}
        />
        <MoneyCard
          label="Expenses"
          icon="wallet-outline"
          color={lightColors.expense}
          container={lightColors.expenseContainer}
          amount={expense}
          info={`Money spent in ${monthName}, including transfer fees.`}
        />
      </View>
    </View>
  );
}

interface MoneyCardProps {
  label: string;
  icon: 'cash-plus' | 'wallet-outline';
  color: string;
  container: string;
  amount: number;
  info: string;
}

function MoneyCard({ label, icon, color, container, amount, info }: MoneyCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.tile, { backgroundColor: container }]}>
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      </View>
      <Pressable
        onPress={() => showSnackbar({ message: info })}
        accessibilityRole="button"
        accessibilityLabel={`${label}: what this means`}
        style={styles.labelRow}
      >
        <Text variant="bodyMedium" style={styles.muted}>
          {label}
        </Text>
        <MaterialCommunityIcons
          name="information-outline"
          size={16}
          color={lightColors.onSurfaceVariant}
        />
      </Pressable>
      <View style={styles.amountRow}>
        <Text variant="labelLarge" style={styles.muted}>
          UGX
        </Text>
        <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
          {formatAmount(amount, 'UGX')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  details: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: lightColors.outline,
    backgroundColor: lightColors.surface,
    borderRadius: radius.pill,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    paddingVertical: spacing.xs + 2,
  },
  cards: { flexDirection: 'row', gap: spacing.md },
  card: {
    flex: 1,
    backgroundColor: lightColors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: lightColors.outline,
    padding: spacing.lg,
    gap: spacing.sm,
    elevation: 1,
  },
  tile: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  muted: { color: lightColors.onSurfaceVariant },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  amount: { flex: 1, fontFamily: fontFamily.semibold, fontSize: 20, color: lightColors.onSurface },
});
