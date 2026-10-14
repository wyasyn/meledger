import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { TagInputSchema } from '@meledger/shared';
import { type Ref, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText } from 'react-native-paper';

import { Sheet, type SheetRef } from '@/components/ui/Sheet';
import type { Tag } from '@/db/schema';
import { findOrCreateTag } from '@/features/tags/repo';
import { fontFamily } from '@/theme/fonts';
import { lightColors, radius, spacing } from '@/theme/tokens';

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
            placeholderTextColor={lightColors.onSurfaceVariant}
            returnKeyType="done"
            maxLength={24}
            accessibilityLabel="New tag name"
            style={styles.input}
          />
          <Button mode="contained" onPress={submit} disabled={!name.trim()}>
            Add
          </Button>
        </View>
        {error ? <HelperText type="error">{error}</HelperText> : null}
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
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    flex: 1,
    borderRadius: radius.small,
    backgroundColor: lightColors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: lightColors.onSurface,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
