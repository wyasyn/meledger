import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { SlideInLeft, SlideInRight } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { lightColors, radius, spacing } from '@/theme/tokens';

import { IconButton } from './IconButton';
import { Text } from './Text';

export type DateRange = { from: Date; to: Date | null };

type CalendarProps =
  | { mode?: 'single'; value: Date; onChange: (date: Date) => void; maxDate?: Date }
  | { mode: 'range'; value: DateRange; onChange: (range: DateRange) => void; maxDate?: Date };

const WEEK = { weekStartsOn: 1 } as const;
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const CELL = 44;

/**
 * Month grid (weeks start on Monday). Single mode picks one day; range mode picks a start
 * then an end, shading the days between. Swipe or use the arrows to change month.
 */
export function Calendar(props: CalendarProps) {
  const anchor = props.mode === 'range' ? props.value.from : props.value;
  const [month, setMonth] = useState(() => startOfMonth(anchor));
  const [direction, setDirection] = useState<1 | -1>(1);
  const max = props.maxDate ? startOfDay(props.maxDate) : null;
  const canGoNext = !max || isBefore(endOfMonth(month), max);

  const go = (delta: 1 | -1) => {
    if (delta === 1 && !canGoNext) return;
    setDirection(delta);
    setMonth((m) => addMonths(m, delta));
  };

  const swipe = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .failOffsetY([-16, 16])
    .onEnd((e) => {
      if (Math.abs(e.translationX) > 48) scheduleOnRN(go, e.translationX < 0 ? 1 : -1);
    });

  const days: Date[] = [];
  for (
    let d = startOfWeek(month, WEEK);
    !isAfter(d, endOfWeek(endOfMonth(month), WEEK));
    d = addDays(d, 1)
  ) {
    days.push(d);
  }

  const pick = (day: Date) => {
    if (props.mode === 'range') {
      const { from, to } = props.value;
      if (to !== null || isBefore(day, from)) props.onChange({ from: day, to: null });
      else props.onChange({ from, to: day });
    } else {
      props.onChange(day);
    }
  };

  const state = (day: Date) => {
    if (props.mode === 'range') {
      const { from, to } = props.value;
      const end = isSameDay(day, from) || (to !== null && isSameDay(day, to));
      const between = to !== null && isAfter(day, from) && isBefore(day, to);
      return {
        selected: end,
        between,
        rangeStart: isSameDay(day, from) && to !== null,
        rangeEnd: to !== null && isSameDay(day, to),
      };
    }
    return {
      selected: isSameDay(day, props.value),
      between: false,
      rangeStart: false,
      rangeEnd: false,
    };
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text variant="subtitle" accessibilityRole="header" accessibilityLiveRegion="polite">
          {format(month, 'MMMM yyyy')}
        </Text>
        <View style={styles.arrows}>
          <IconButton
            icon="chevron-left"
            label="Previous month"
            variant="surface"
            size={36}
            onPress={() => go(-1)}
          />
          <IconButton
            icon="chevron-right"
            label="Next month"
            variant="surface"
            size={36}
            disabled={!canGoNext}
            onPress={() => go(1)}
          />
        </View>
      </View>
      <View style={styles.week}>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} variant="small" tone="muted" align="center" style={styles.cell}>
            {d}
          </Text>
        ))}
      </View>
      <GestureDetector gesture={swipe}>
        <Animated.View
          key={month.getTime()}
          entering={(direction === 1 ? SlideInRight : SlideInLeft).duration(220)}
          style={styles.grid}
        >
          {days.map((day) => {
            const inMonth = isSameMonth(day, month);
            const disabled = (max !== null && isAfter(day, max)) || !inMonth;
            const s = state(day);
            const today = isToday(day);
            return (
              <View
                key={day.getTime()}
                style={[
                  styles.cellWrap,
                  s.between && styles.band,
                  s.rangeStart && styles.bandStart,
                  s.rangeEnd && styles.bandEnd,
                ]}
              >
                <Pressable
                  onPress={() => pick(day)}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={format(day, 'EEEE d MMMM yyyy')}
                  accessibilityState={{ selected: s.selected, disabled }}
                  style={[
                    styles.day,
                    today && !s.selected && styles.today,
                    s.selected && styles.selected,
                  ]}
                >
                  {inMonth ? (
                    <Text
                      variant={s.selected || today ? 'bodyStrong' : 'body'}
                      color={
                        s.selected
                          ? lightColors.onPrimary
                          : disabled
                            ? '#C4C4C8'
                            : today
                              ? lightColors.primary
                              : lightColors.onSurface
                      }
                    >
                      {format(day, 'd')}
                    </Text>
                  ) : null}
                </Pressable>
              </View>
            );
          })}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: lightColors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrows: { flexDirection: 'row', gap: spacing.sm },
  week: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { flex: 1 },
  // Just under a seventh: an exact 100/7% rounds up on some widths and wraps the seventh day.
  cellWrap: { width: '14.28%', height: CELL, alignItems: 'center', justifyContent: 'center' },
  band: { backgroundColor: lightColors.primaryContainer },
  bandStart: {
    backgroundColor: lightColors.primaryContainer,
    borderTopLeftRadius: CELL / 2,
    borderBottomLeftRadius: CELL / 2,
  },
  bandEnd: {
    backgroundColor: lightColors.primaryContainer,
    borderTopRightRadius: CELL / 2,
    borderBottomRightRadius: CELL / 2,
  },
  day: {
    width: CELL - 4,
    height: CELL - 4,
    borderRadius: (CELL - 4) / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  today: { backgroundColor: lightColors.primaryContainer },
  selected: { backgroundColor: lightColors.primary },
});
