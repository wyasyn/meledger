import { startOfMonth, subMonths } from 'date-fns';
import { StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Menu } from '@/components/ui/Menu';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { lightColors, radius, shadow, spacing } from '@/theme/tokens';

import { monthPeriod, type Period, periodLabel } from '../../home/logic';

interface MonthPillProps {
  period: Period;
  onChange: (period: Period) => void;
}

/** White "October 2026 ▾" pill that picks one of the last 12 months. */
export function MonthPill({ period, onChange }: MonthPillProps) {
  const label = periodLabel(period);
  const items = Array.from({ length: 12 }, (_, i) => {
    const month = startOfMonth(subMonths(new Date(), i));
    return { value: String(month.getTime()), label: periodLabel(monthPeriod(month)) };
  });
  return (
    <Menu
      items={items}
      selected={String(period.from.getTime())}
      onSelect={(value) => onChange(monthPeriod(new Date(Number(value))))}
      accessibilityLabel="Choose a month"
      anchor={(open) => (
        <PressableScale
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={`Month: ${label}. Change`}
          style={styles.pill}
        >
          <Text variant="label">{label}</Text>
          <Icon name="chevron-down" weight="bold" size={14} color={lightColors.onSurface} />
        </PressableScale>
      )}
    />
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    height: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: lightColors.surface,
    boxShadow: shadow.card,
  },
});
