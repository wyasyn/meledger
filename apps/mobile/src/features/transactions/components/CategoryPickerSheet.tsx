import { BottomSheetSectionList } from '@gorhom/bottom-sheet';
import { type Ref, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { IconTile } from '@/components/ui/IconTile';
import { PressableScale } from '@/components/ui/PressableScale';
import { Sheet, type SheetRef } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import type { Category } from '@/db/schema';
import { lightColors, radius, spacing } from '@/theme/tokens';

interface CategoryPickerSheetProps {
  ref: Ref<SheetRef>;
  categories: Category[];
  kind: 'income' | 'expense';
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Categories of one kind, each group (Fixed, Food, Transport...) as its own white card. */
export function CategoryPickerSheet({
  ref,
  categories,
  kind,
  selectedId,
  onSelect,
}: CategoryPickerSheetProps) {
  const insets = useSafeAreaInsets();
  const sections = useMemo(() => {
    const byGroup = new Map<string, Category[]>();
    for (const c of categories) {
      if (c.kind !== kind) continue;
      const list = byGroup.get(c.group);
      if (list) list.push(c);
      else byGroup.set(c.group, [c]);
    }
    return [...byGroup].map(([title, data]) => ({ title, data }));
  }, [categories, kind]);

  return (
    <Sheet ref={ref} title="Category" snapPoints={['70%', '95%']}>
      <BottomSheetSectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        renderSectionHeader={({ section }) =>
          kind === 'expense' ? (
            <Text variant="caption" tone="muted" style={styles.header}>
              {section.title}
            </Text>
          ) : null
        }
        renderItem={({ item, index, section }) => {
          const selected = item.id === selectedId;
          const first = index === 0;
          const last = index === section.data.length - 1;
          return (
            <View style={[styles.card, first && styles.first, last && styles.last]}>
              {first ? null : <View style={styles.divider} />}
              <PressableScale
                onPress={() => onSelect(item.id)}
                scaleTo={0.985}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={item.name}
                style={styles.row}
              >
                <IconTile icon={item.icon} color={item.color} size={40} />
                <Text variant={selected ? 'bodyStrong' : 'body'} style={styles.name}>
                  {item.name}
                </Text>
                {selected ? (
                  <Icon name="check" weight="bold" size={20} color={lightColors.primary} />
                ) : null}
              </PressableScale>
            </View>
          );
        }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.gutter },
  header: { paddingHorizontal: spacing.xs, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  card: { backgroundColor: lightColors.surface },
  first: { borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, paddingTop: 4 },
  last: {
    borderBottomLeftRadius: radius.card,
    borderBottomRightRadius: radius.card,
    paddingBottom: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: lightColors.outline,
    marginLeft: spacing.lg + 40 + spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  name: { flex: 1 },
});
