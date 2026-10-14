import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { lightColors, radius, spacing } from '@/theme/tokens';

import { Icon, type IconKey } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconKey;
  /** Icon colour when not selected (e.g. a wallet's colour). */
  iconColor?: string;
  /**
   * "surface": white chip on the grey page. "muted": grey chip inside a white card.
   */
  tone?: 'surface' | 'muted';
  accessibilityLabel?: string;
}

/** Flat toggle chip; the selected one turns light blue. */
export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  iconColor,
  tone = 'surface',
  accessibilityLabel,
}: ChipProps) {
  const bg = selected
    ? lightColors.primaryContainer
    : tone === 'surface'
      ? lightColors.surface
      : lightColors.background;
  const fg = selected ? lightColors.onPrimaryContainer : lightColors.onSurface;
  return (
    <PressableScale
      onPress={onPress}
      disabled={!onPress}
      scaleTo={0.94}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={onPress ? { selected } : undefined}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.chip, { backgroundColor: bg }]}
    >
      {icon ? (
        <Icon
          name={icon}
          size={16}
          weight={selected ? 'fill' : 'regular'}
          color={selected ? fg : (iconColor ?? lightColors.onSurfaceVariant)}
        />
      ) : null}
      <Text variant="label" color={fg}>
        {label}
      </Text>
    </PressableScale>
  );
}

/** Wrapping row of chips. */
export function ChipGroup({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    height: 38,
    paddingHorizontal: spacing.lg - 2,
    borderRadius: radius.pill,
  },
  group: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
