import { BottomSheetSectionList } from '@gorhom/bottom-sheet';
import { type Ref, useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { IconTile } from '@/components/ui/IconTile';
import { Sheet, type SheetRef } from '@/components/ui/Sheet';
import type { Category } from '@/db/schema';
import { lightColors, spacing } from '@/theme/tokens';

interface CategoryPickerSheetProps {
  ref: Ref<SheetRef>;
  categories: Category[];
  kind: 'income' | 'expense';
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** Categories of one kind, grouped under their group headings (Fixed, Food, Transport...). */
export function CategoryPickerSheet({
  ref,
  categories,
  kind,
  selectedId,
  onSelect,
}: CategoryPickerSheetProps) {
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
        contentContainerStyle={styles.content}
        renderSectionHeader={({ section }) =>
          kind === 'expense' ? (
            <Text variant="labelMedium" style={styles.header}>
              {section.title}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onSelect(item.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: item.id === selectedId }}
            android_ripple={{ color: lightColors.primaryContainer }}
            style={styles.row}
          >
            <IconTile icon={item.icon} color={item.color} size={40} />
            <Text variant="bodyLarge" style={styles.name}>
              {item.name}
            </Text>
            {item.id === selectedId ? (
              <Icon source="check" size={22} color={lightColors.primary} />
            ) : null}
          </Pressable>
        )}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xxl },
  header: {
    color: lightColors.onSurfaceVariant,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  name: { flex: 1 },
});
