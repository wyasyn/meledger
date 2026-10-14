import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { typography } from '@/theme/typography';
import { lightColors } from '@/theme/tokens';

import { FieldCard } from './FieldCard';

export const PLACEHOLDER_COLOR = '#A1A1AA';

interface TextFieldProps extends Omit<TextInputProps, 'style' | 'placeholderTextColor'> {
  label: string;
  error?: string;
}

/** Labelled text input in a white field card; a blue ring shows while it has focus. */
export function TextField({ label, error, onFocus, onBlur, ...input }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <FieldCard label={label} error={error} focused={focused}>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={PLACEHOLDER_COLOR}
        cursorColor={lightColors.primary}
        selectionColor={`${lightColors.primary}40`}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, input.multiline && styles.multiline]}
        {...input}
      />
    </FieldCard>
  );
}

const styles = StyleSheet.create({
  input: {
    ...typography.subtitle,
    color: lightColors.onSurface,
    padding: 0,
  },
  multiline: { minHeight: 44, textAlignVertical: 'top' },
});
