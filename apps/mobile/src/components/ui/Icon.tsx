import type { IconWeight } from 'phosphor-react-native';
import { createElement } from 'react';
import { View } from 'react-native';

import { iconFor, type IconName } from './icons';

export type { IconName };

/** A registry key, or a key read from the database (typed as a plain string). */
export type IconKey = IconName | (string & {});

interface IconProps {
  /** Registry key (see icons.ts). Stored keys from the database are accepted as plain strings. */
  name: IconKey;
  size?: number;
  color: string;
  /** "regular" by default; "fill" marks active states (selected tab, checked row). */
  weight?: IconWeight;
}

/**
 * Decorative Phosphor icon, hidden from accessibility so Android doesn't read it as part of
 * the parent's label. Give the pressable around an icon-only control its own accessibilityLabel.
 */
export function Icon({ name, size = 24, color, weight = 'regular' }: IconProps) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      pointerEvents="none"
    >
      {/* The registry returns an existing component; createElement renders it by reference. */}
      {createElement(iconFor(name), { size, color, weight })}
    </View>
  );
}
