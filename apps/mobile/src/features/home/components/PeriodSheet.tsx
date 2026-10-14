import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { format, min, startOfDay } from 'date-fns';
import { type Ref, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Icon as PaperIcon, Text } from 'react-native-paper';

import { Icon } from '@/components/ui/Icon';
import { Sheet, type SheetRef } from '@/components/ui/Sheet';
import { lightColors, radius, spacing } from '@/theme/tokens';

import {
  customPeriod,
  lastDay,
  type Period,
  PRESET_LABELS,
  type PeriodPreset,
  presetOf,
  presetPeriod,
} from '../logic';

interface PeriodSheetProps {
  ref: Ref<SheetRef>;
  period: Period;
  onSelect: (period: Period) => void;
}

const PRESETS = Object.keys(PRESET_LABELS) as PeriodPreset[];

/** Picks the Home period: a preset, or a custom range of days. */
export function PeriodSheet({ ref, period, onSelect }: PeriodSheetProps) {
  const now = new Date();
  const active = presetOf(period, now);
  // Pickers stop at today, so a period that runs into the future starts the range at today.
  const [from, setFrom] = useState(() => min([period.from, startOfDay(now)]));
  const [to, setTo] = useState(() => min([lastDay(period), startOfDay(now)]));

  const pickDate = (value: Date, minimumDate: Date | undefined, onPick: (d: Date) => void) =>
    DateTimePickerAndroid.open({
      value,
      mode: 'date',
      minimumDate,
      maximumDate: new Date(),
      onValueChange: (_event, picked) => onPick(picked),
    });

  return (
    <Sheet ref={ref} title="Period">
      <View style={styles.content}>
        {PRESETS.map((preset) => (
          <Pressable
            key={preset}
            onPress={() => onSelect(presetPeriod(preset, now))}
            accessibilityRole="radio"
            accessibilityState={{ selected: preset === active }}
            android_ripple={{ color: lightColors.primaryContainer }}
            style={styles.row}
          >
            <Text variant="bodyLarge" style={styles.flex}>
              {PRESET_LABELS[preset]}
            </Text>
            {preset === active ? (
              <PaperIcon source="check" size={22} color={lightColors.primary} />
            ) : null}
          </Pressable>
        ))}

        <View style={styles.custom}>
          <Text variant="labelLarge" style={styles.muted}>
            Custom range
          </Text>
          <View style={styles.dates}>
            <DateField
              label="From"
              date={from}
              onPress={() =>
                pickDate(from, undefined, (d) => {
                  setFrom(d);
                  if (d > to) setTo(d);
                })
              }
            />
            <DateField label="To" date={to} onPress={() => pickDate(to, from, setTo)} />
          </View>
          <Button mode="contained" onPress={() => onSelect(customPeriod(from, to))}>
            Apply range
          </Button>
        </View>
      </View>
    </Sheet>
  );
}

interface DateFieldProps {
  label: string;
  date: Date;
  onPress: () => void;
}

function DateField({ label, date, onPress }: DateFieldProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${format(date, 'd MMMM yyyy')}. Change`}
      style={styles.dateField}
    >
      <View style={styles.flex}>
        <Text variant="labelSmall" style={styles.muted}>
          {label}
        </Text>
        <Text variant="bodyLarge">{format(date, 'd MMM yyyy')}</Text>
      </View>
      <Icon name="calendar-month-outline" size={22} color={lightColors.onSurface} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  flex: { flex: 1 },
  muted: { color: lightColors.onSurfaceVariant },
  custom: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderColor: lightColors.outline,
  },
  dates: { flexDirection: 'row', gap: spacing.md },
  dateField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: lightColors.background,
    borderRadius: radius.small,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
