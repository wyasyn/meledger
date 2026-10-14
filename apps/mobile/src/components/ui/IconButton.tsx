import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { lightColors, shadow } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

type Variant = 'plain' | 'surface' | 'tonal' | 'dark' | 'glass';

const VARIANTS: Record<Variant, { bg: string; fg: string; lifted?: boolean }> = {
  plain: { bg: 'transparent', fg: lightColors.onSurface },
  surface: { bg: lightColors.surface, fg: lightColors.onSurface, lifted: true },
  tonal: { bg: lightColors.primaryContainer, fg: lightColors.onPrimaryContainer },
  dark: { bg: lightColors.onSurface, fg: '#FFFFFF' },
  /** On the blue header. */
  glass: { bg: 'rgba(255,255,255,0.2)', fg: '#FFFFFF' },
};

interface IconButtonProps {
  icon: IconName;
  /** Required: icon-only controls need a spoken name. */
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: number;
  /** Overrides the variant's icon colour. */
  color?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Round icon-only button for headers and toolbars. */
export function IconButton({
  icon,
  label,
  onPress,
  variant = 'plain',
  size = 44,
  color,
  disabled,
  style,
}: IconButtonProps) {
  const v = VARIANTS[variant];
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={size < 44 ? (44 - size) / 2 : undefined}
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: v.bg },
        v.lifted && styles.lifted,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Icon name={icon} size={Math.round(size * 0.48)} color={color ?? v.fg} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  lifted: { boxShadow: shadow.card },
  disabled: { opacity: 0.4 },
});
