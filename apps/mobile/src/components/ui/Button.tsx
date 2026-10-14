import { ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { lightColors, radius, spacing, tint } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'dark' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, { bg: string; fg: string }> = {
  primary: { bg: lightColors.primary, fg: lightColors.onPrimary },
  secondary: { bg: lightColors.primaryContainer, fg: lightColors.onPrimaryContainer },
  dark: { bg: lightColors.onSurface, fg: '#FFFFFF' },
  ghost: { bg: 'transparent', fg: lightColors.onSurface },
  danger: { bg: tint(lightColors.expense, 0.1), fg: lightColors.expense },
};

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'md' | 'sm';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  /** Stretch to the parent's width. */
  block?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/** Pill button. Primary for the main action, secondary (tonal) and ghost for the rest. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  loading = false,
  block = false,
  accessibilityHint,
  style,
}: ButtonProps) {
  const { bg, fg } = VARIANTS[variant];
  const inactive = disabled || loading;
  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        { backgroundColor: bg },
        block && styles.block,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={size === 'sm' ? 18 : 20} color={fg} /> : null}
          <Text variant={size === 'sm' ? 'label' : 'button'} color={fg} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
  },
  md: { height: 54, paddingHorizontal: spacing.xxl },
  sm: { height: 40, paddingHorizontal: spacing.lg },
  block: { alignSelf: 'stretch' },
  disabled: { opacity: 0.4 },
});
