import { formatAmount, formatMoney } from '@meledger/shared';
import { startOfMonth, subMonths } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Menu, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { showSnackbar } from '@/features/feedback/snackbar';
import { fontFamily } from '@/theme/fonts';
import { lightColors, radius, spacing } from '@/theme/tokens';

import { monthPeriod, periodLabel } from '../logic';
import { useHomeStore } from '../store';

const WHITE = '#FFFFFF';
const WHITE_SOFT = 'rgba(255,255,255,0.75)';
const WHITE_FILL = 'rgba(255,255,255,0.2)';

interface BalanceHeaderProps {
  balance: number;
  weekChange: number;
}

/** Blue gradient header with month selector (shows any Home period), current balance and change vs last week. */
export function BalanceHeader({ balance, weekChange }: BalanceHeaderProps) {
  const insets = useSafeAreaInsets();
  const period = useHomeStore((s) => s.period);
  const setPeriod = useHomeStore((s) => s.setPeriod);
  const label = periodLabel(period);
  const [menuOpen, setMenuOpen] = useState(false);
  const months = Array.from({ length: 12 }, (_, i) => startOfMonth(subMonths(new Date(), i)));

  const change =
    weekChange === 0
      ? 'Same as last week'
      : `${weekChange > 0 ? '+' : '-'}${formatMoney(Math.abs(weekChange))} than last week`;

  return (
    <LinearGradient
      colors={lightColors.headerGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.root, { paddingTop: insets.top + spacing.sm }]}
    >
      <View style={styles.topRow}>
        <View style={styles.avatar} accessibilityLabel="Profile">
          <Icon name="account" size={24} color={WHITE} />
        </View>
        <Menu
          visible={menuOpen}
          onDismiss={() => setMenuOpen(false)}
          anchorPosition="bottom"
          anchor={
            <Pressable
              onPress={() => setMenuOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`Period: ${label}. Change`}
              style={styles.monthPill}
            >
              <Text variant="labelLarge" style={styles.white}>
                {label}
              </Text>
              <Icon name="chevron-down" size={18} color={WHITE} />
            </Pressable>
          }
        >
          {months.map((m) => (
            <Menu.Item
              key={m.getTime()}
              title={periodLabel(monthPeriod(m))}
              leadingIcon={
                period.kind === 'month' && m.getTime() === period.from.getTime()
                  ? 'check'
                  : undefined
              }
              onPress={() => {
                setPeriod(monthPeriod(m));
                setMenuOpen(false);
              }}
            />
          ))}
        </Menu>
        <IconButton
          icon="bell-outline"
          iconColor={WHITE}
          containerColor={WHITE_FILL}
          accessibilityLabel="Notifications"
          onPress={() => showSnackbar({ message: 'Notifications arrive in milestone 5' })}
          style={styles.bell}
        />
      </View>

      <View style={styles.center}>
        <Text variant="bodyMedium" style={styles.soft}>
          Current Balance
        </Text>
        <View
          style={styles.amountRow}
          accessible
          accessibilityLabel={`Current balance ${formatMoney(balance)}`}
        >
          <Text style={styles.code}>{balance < 0 ? '-UGX' : 'UGX'}</Text>
          <Text style={styles.amount}>{formatAmount(Math.abs(balance), 'UGX')}</Text>
        </View>
        <View style={styles.changePill}>
          <Text variant="labelMedium" style={styles.white}>
            {change}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl + spacing.xxl },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: WHITE_FILL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: WHITE_FILL,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bell: { margin: 0 },
  center: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.xs },
  white: { color: WHITE },
  soft: { color: WHITE_SOFT },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  code: { fontFamily: fontFamily.semibold, fontSize: 20, color: WHITE_SOFT },
  amount: { fontFamily: fontFamily.semibold, fontSize: 36, lineHeight: 44, color: WHITE },
  changePill: {
    backgroundColor: WHITE_FILL,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
});
