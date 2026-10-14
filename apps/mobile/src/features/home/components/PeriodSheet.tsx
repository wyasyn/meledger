import { format, isSameDay, min, startOfDay } from 'date-fns';
import { type Ref, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Calendar, type DateRange } from '@/components/ui/Calendar';
import { ListGroup, ListRow } from '@/components/ui/ListGroup';
import { Sheet, type SheetRef } from '@/components/ui/Sheet';
import { spacing } from '@/theme/tokens';

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

const rangeLabel = (r: DateRange) =>
  r.to === null || isSameDay(r.from, r.to)
    ? format(r.from, 'd MMM yyyy')
    : `${format(r.from, 'd MMM')} to ${format(r.to, 'd MMM yyyy')}`;

/** Picks the Home period: a preset, or a custom range of days on a calendar. */
export function PeriodSheet({ ref, period, onSelect }: PeriodSheetProps) {
  const now = new Date();
  const active = presetOf(period, now);
  const [custom, setCustom] = useState(active === null);
  // The calendar stops at today, so a period that runs into the future starts the range at today.
  const [range, setRange] = useState<DateRange>(() => ({
    from: min([period.from, startOfDay(now)]),
    to: min([lastDay(period), startOfDay(now)]),
  }));

  return (
    <Sheet
      ref={ref}
      title="Period"
      footer={
        custom ? (
          <Button
            label={`Show ${rangeLabel(range)}`}
            block
            onPress={() => onSelect(customPeriod(range.from, range.to ?? range.from))}
          />
        ) : undefined
      }
    >
      <View style={styles.content}>
        <ListGroup>
          {PRESETS.map((preset) => (
            <ListRow
              key={preset}
              title={PRESET_LABELS[preset]}
              selected={!custom && preset === active}
              onPress={() => onSelect(presetPeriod(preset, now))}
            />
          ))}
          <ListRow
            title="Custom range"
            subtitle={custom ? 'Tap a start day, then an end day' : undefined}
            icon="calendar"
            iconColor="blue"
            selected={custom}
            onPress={() => setCustom(true)}
          />
        </ListGroup>
        {custom ? <Calendar mode="range" value={range} onChange={setRange} maxDate={now} /> : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.gutter, gap: spacing.lg },
});
