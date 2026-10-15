import { isSameDay, startOfDay, subDays } from 'date-fns';
import type { Ref } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/tokens';

import { Calendar } from './Calendar';
import { Chip, ChipGroup } from './Chip';
import { Sheet, type SheetRef } from './Sheet';

interface DatePickerSheetProps {
  ref: Ref<SheetRef>;
  title?: string;
  value: Date;
  /** Called with the picked day; the caller dismisses the sheet. */
  onChange: (date: Date) => void;
  maxDate?: Date;
  /** Today and Yesterday chips; off for dates in the future (due dates, targets). */
  shortcuts?: boolean;
}

/** Calendar sheet with Today / Yesterday shortcuts. */
export function DatePickerSheet({
  ref,
  title = 'Pick a date',
  value,
  onChange,
  maxDate,
  shortcuts = true,
}: DatePickerSheetProps) {
  const today = startOfDay(new Date());
  const yesterday = subDays(today, 1);
  return (
    <Sheet ref={ref} title={title}>
      <View style={styles.body}>
        {shortcuts ? (
          <ChipGroup>
            <Chip
              label="Today"
              selected={isSameDay(value, today)}
              onPress={() => onChange(today)}
            />
            <Chip
              label="Yesterday"
              selected={isSameDay(value, yesterday)}
              onPress={() => onChange(yesterday)}
            />
          </ChipGroup>
        ) : null}
        <Calendar value={value} onChange={onChange} maxDate={maxDate} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.gutter, gap: spacing.lg },
});
