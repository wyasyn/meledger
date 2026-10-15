import { CATEGORY_COLORS, type CategoryColor } from '@meledger/shared';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme/tokens';

import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

const COLORS = Object.keys(CATEGORY_COLORS) as CategoryColor[];

/** Row of palette colours; the chosen one gets a ring and a check. */
export function ColorSwatches({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: CategoryColor) => void;
}) {
  return (
    <View style={styles.swatches}>
      {COLORS.map((color) => {
        const selected = value === color;
        return (
          <PressableScale
            key={color}
            onPress={() => onChange(color)}
            scaleTo={0.88}
            accessibilityRole="radio"
            accessibilityLabel={color}
            accessibilityState={{ selected }}
            style={[
              styles.swatch,
              { backgroundColor: CATEGORY_COLORS[color] },
              selected && {
                boxShadow: `0 0 0 3px #FFFFFF, 0 0 0 5px ${CATEGORY_COLORS[color]}`,
              },
            ]}
          >
            {selected ? <Icon name="check" weight="bold" size={16} color="#FFFFFF" /> : null}
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingVertical: 4 },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
