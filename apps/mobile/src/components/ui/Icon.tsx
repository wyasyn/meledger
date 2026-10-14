import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type IconProps = ComponentProps<typeof MaterialCommunityIcons>;

/**
 * Decorative Material icon. Icons render as a glyph in a Text, which Android would otherwise
 * read out as part of the parent's label, so they are hidden from accessibility. Give the
 * pressable around an icon-only control its own accessibilityLabel.
 */
export function Icon(props: IconProps) {
  return (
    <MaterialCommunityIcons importantForAccessibility="no" accessibilityElementsHidden {...props} />
  );
}
