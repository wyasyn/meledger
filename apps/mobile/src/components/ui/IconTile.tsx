import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { paletteColor, tint } from '@/theme/tokens';

interface IconTileProps {
  icon: string;
  /** Palette key (e.g. "lime") or hex colour. */
  color: string;
  size?: number;
  round?: boolean;
}

/** Rounded square (or circle) with a tinted background and the icon in full colour. */
export function IconTile({ icon, color, size = 44, round = false }: IconTileProps) {
  const hex = paletteColor(color);
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: round ? size / 2 : Math.round(size * 0.32),
          backgroundColor: tint(hex),
        },
      ]}
    >
      <Icon name={icon} size={size * 0.5} color={hex} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
});
