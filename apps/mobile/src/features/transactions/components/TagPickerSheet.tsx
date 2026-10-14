import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { TagInputSchema } from '@meledger/shared';
import { type Ref, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Sheet, type SheetRef } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { PLACEHOLDER_COLOR } from '@/components/ui/TextField';
import type { Tag } from '@/db/schema';
import { findOrCreateTag } from '@/features/tags/repo';
import { typography } from '@/theme/typography';
import { lightColors, radius, shadow, spacing } from '@/theme/tokens';

import { TagChip } from './TagChip';

interface TagPickerSheetProps {
  ref: Ref<SheetRef>;
  tags: Tag[];
  selectedIds: string[];
  onAdd: (id: string) => void;
}

/** Pick an existing tag or type a new one. */
export function TagPickerSheet({ ref, tags, selectedIds, onAdd }: TagPickerSheetProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string>();
  const available = tags.filter((t) => !selectedIds.includes(t.id));

  const submit = async () => {
    const parsed = TagInputSchema.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    onAdd(await findOrCreateTag(parsed.data.name));
    setName('');
    setError(undefined);
  };

  return (
    <Sheet ref={ref} title="Add tag">
      <View style={styles.body}>
        <View style={styles.inputRow}>
          <BottomSheetTextInput
            value={name}
            onChangeText={setName}
            onSubmitEditing={submit}
            placeholder="New tag, e.g. Vacation"
            placeholderTextColor={PLACEHOLDER_COLOR}
            cursorColor={lightColors.primary}
            returnKeyType="done"
            maxLength={24}
            accessibilityLabel="New tag name"
            style={styles.input}
          />
          <Button label="Add" size="sm" onPress={submit} disabled={!name.trim()} />
        </View>
        {error ? (
          <Text variant="small" tone="expense">
            {error}
          </Text>
        ) : null}
        {available.length > 0 ? (
          <Text variant="caption" tone="muted">
            Your tags
          </Text>
        ) : null}
        {available.length > 0 ? (
          <View style={styles.chips}>
            {available.map((tag) => (
              <TagChip key={tag.id} tag={tag} onPress={() => onAdd(tag.id)} />
            ))}
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.gutter, gap: spacing.md },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: lightColors.surface,
    borderRadius: radius.field,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    height: 60,
    boxShadow: shadow.card,
  },
  input: { flex: 1, ...typography.body, color: lightColors.onSurface, padding: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
