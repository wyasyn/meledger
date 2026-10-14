import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import type { Tag } from '@/db/schema';
import { paletteColor, radius, spacing, tint } from '@/theme/tokens';

interface TagChipProps {
  tag: Pick<Tag, 'name' | 'color'>;
  onPress?: () => void;
  /** Shows a close icon and removes the tag when tapped. */
  onRemove?: () => void;
  small?: boolean;
}

/** Coloured pill: tag colour at 10% behind the tag colour text. */
export function TagChip({ tag, onPress, onRemove, small = false }: TagChipProps) {
  const color = paletteColor(tag.color);
  const handler = onRemove ?? onPress;
  return (
    <Pressable
      onPress={handler}
      disabled={!handler}
      accessibilityRole={handler ? 'button' : undefined}
      accessibilityLabel={onRemove ? `Remove tag ${tag.name}` : tag.name}
      style={[styles.chip, small && styles.small, { backgroundColor: tint(color, 0.12) }]}
    >
      <Text variant={small ? 'micro' : 'label'} color={color}>
        {tag.name}
      </Text>
      {onRemove ? <Icon name="close" size={14} color={color} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  small: { paddingHorizontal: spacing.sm, paddingVertical: 2 },
});
