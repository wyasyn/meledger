import { formatAmount, formatMoney } from '@meledger/shared';
import { startOfMonth, subMonths } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Menu } from '@/components/ui/Menu';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { MASK } from '@/features/security/balances';
import { lightColors, radius, spacing } from '@/theme/tokens';

import { monthPeriod, periodLabel } from '../logic';
import { useHomeStore } from '../store';

const WHITE = '#FFFFFF';
const WHITE_SOFT = 'rgba(255,255,255,0.78)';
const WHITE_FILL = 'rgba(255,255,255,0.18)';

interface BalanceHeaderProps {
  balance: number;
  weekChange: number;
  /** Amounts show as dots (Settings > Security > Hide balances). */
  hidden: boolean;
  /** Hide balances is on, so tapping the balance reveals or hides it again. */
  canHide: boolean;
  onToggleHidden: () => void;
}

/** Blue gradient header with month selector (shows any Home period), current balance and change vs last week. */
export function BalanceHeader({
  balance,
  weekChange,
  hidden,
  canHide,
  onToggleHidden,
}: BalanceHeaderProps) {
  const insets = useSafeAreaInsets();
  const period = useHomeStore((s) => s.period);
  const setPeriod = useHomeStore((s) => s.setPeriod);
  const label = periodLabel(period);
  const months = Array.from({ length: 12 }, (_, i) => startOfMonth(subMonths(new Date(), i)));
  const items = months.map((m) => ({
    value: String(m.getTime()),
    label: periodLabel(monthPeriod(m)),
  }));
  const selected = period.kind === 'month' ? String(period.from.getTime()) : undefined;

  const change = hidden
    ? 'Tap the balance to show it'
    : weekChange === 0
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
        {/* Same style as the bell; the profile lives under Settings. */}
        <IconButton
          icon="user"
          label="Profile and settings"
          variant="glass"
          onPress={() => router.navigate('/settings')}
        />
        <Menu
          items={items}
          selected={selected}
          onSelect={(value) => setPeriod(monthPeriod(new Date(Number(value))))}
          accessibilityLabel="Choose a month"
          anchor={(open) => (
            <PressableScale
              onPress={open}
              accessibilityRole="button"
              accessibilityLabel={`Period: ${label}. Change`}
              style={styles.monthPill}
            >
              <Text variant="label" tone="inverse">
                {label}
              </Text>
              <Icon name="chevron-down" weight="bold" size={14} color={WHITE} />
            </PressableScale>
          )}
        />
        <IconButton
          icon="bell"
          label="Reminders and alerts"
          variant="glass"
          onPress={() => router.push('/settings/notifications')}
        />
      </View>

      <View style={styles.center}>
        <Text variant="caption" color={WHITE_SOFT}>
          Current Balance
        </Text>
        <PressableScale
          onPress={canHide ? onToggleHidden : undefined}
          disabled={!canHide}
          scaleTo={0.97}
          style={styles.amountRow}
          accessibilityRole={canHide ? 'button' : undefined}
          accessibilityLabel={
            hidden ? 'Current balance hidden. Show it' : `Current balance ${formatMoney(balance)}`
          }
        >
          <Text variant="title" color={WHITE_SOFT}>
            {!hidden && balance < 0 ? '-UGX' : 'UGX'}
          </Text>
          <Text variant="display" tone="inverse">
            {hidden ? MASK : formatAmount(Math.abs(balance), 'UGX')}
          </Text>
        </PressableScale>
        <View style={styles.changePill}>
          <Icon
            name={hidden ? 'eye-slash' : weekChange < 0 ? 'trend-down' : 'trend-up'}
            weight="bold"
            size={12}
            color={WHITE}
          />
          <Text variant="small" tone="inverse">
            {change}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: spacing.gutter,
    paddingBottom: spacing.xxl + spacing.xxxl + spacing.lg,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: WHITE_FILL,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    height: 40,
  },
  center: { alignItems: 'center', marginTop: spacing.xxxl + spacing.md, gap: spacing.sm },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  changePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: WHITE_FILL,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
  },
});
