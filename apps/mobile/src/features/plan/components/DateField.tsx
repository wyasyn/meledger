import { format } from 'date-fns';
import { useRef } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

import { DatePickerSheet } from '@/components/ui/DatePickerSheet';
import { FieldCard } from '@/components/ui/FieldCard';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import type { SheetRef } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { lightColors, spacing } from '@/theme/tokens';

interface DateFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  /** Shown when there is no date; with it the date can be cleared. */
  emptyLabel?: string;
  /** Past dates only (with Today / Yesterday shortcuts). */
  past?: boolean;
  error?: string;
}

/** A date in a field card; tapping opens the calendar sheet. */
export function DateField({
  label,
  value,
  onChange,
  emptyLabel,
  past = false,
  error,
}: DateFieldProps) {
  const sheet = useRef<SheetRef>(null);
  return (
    <>
      <FieldCard
        label={label}
        error={error}
        onPress={() => {
          // The calendar sheet would open behind the keyboard.
          Keyboard.dismiss();
          sheet.current?.present();
        }}
        accessibilityLabel={`${label}: ${value ? format(value, 'd MMMM yyyy') : (emptyLabel ?? 'none')}. Change`}
      >
        <View style={styles.row}>
          <Text variant="subtitle" tone={value ? 'default' : 'muted'} style={styles.flex}>
            {value ? format(value, 'EEE d MMM yyyy') : (emptyLabel ?? 'Choose a date')}
          </Text>
          {value && emptyLabel ? (
            <IconButton
              icon="close"
              label={`Clear ${label.toLowerCase()}`}
              size={32}
              variant="plain"
              onPress={() => onChange(null)}
            />
          ) : (
            <Icon name="calendar" size={22} color={lightColors.onSurface} />
          )}
        </View>
      </FieldCard>
      <DatePickerSheet
        ref={sheet}
        title={label}
        value={value ?? new Date()}
        shortcuts={past}
        maxDate={past ? new Date() : undefined}
        onChange={(picked) => {
          onChange(picked);
          setTimeout(() => sheet.current?.dismiss(), 180);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
});
