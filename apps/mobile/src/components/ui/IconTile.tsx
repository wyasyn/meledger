import type { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { paletteColor, radius, tint } from '@/theme/tokens';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

interface IconTileProps {
  icon: string;
  /** Palette key (e.g. "violet") or hex colour. */
  color: string;
  size?: number;
  round?: boolean;
}

/** 44x44 rounded square with a tinted background and the icon in full colour. */
export function IconTile({ icon, color, size = 44, round = false }: IconTileProps) {
  const hex = paletteColor(color);
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: round ? size / 2 : radius.small,
          backgroundColor: tint(hex),
        },
      ]}
    >
      <Icon name={icon as IconName} size={size * 0.5} color={hex} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
});
