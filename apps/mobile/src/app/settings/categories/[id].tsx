import { zodResolver } from '@hookform/resolvers/zod';
import { type CategoryInput, CategoryInputSchema } from '@meledger/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { type Path, type PathValue, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ColorSwatches } from '@/components/ui/ColorSwatches';
import { FieldCard } from '@/components/ui/FieldCard';
import { IconTile } from '@/components/ui/IconTile';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { PressableScale } from '@/components/ui/PressableScale';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet, type SheetRef } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import type { Category } from '@/db/schema';
import { CATEGORY_ICONS } from '@/features/categories/icons';
import {
  countCategoryEntries,
  createCategory,
  deleteCategory,
  updateCategory,
  useAllCategories,
} from '@/features/categories/repo';
import { FormScreen } from '@/features/plan/components/FormScreen';
import { lightColors, radius, spacing } from '@/theme/tokens';

const KINDS = [
  { value: 'expense', label: 'Expense' },
  { value: 'income', label: 'Income' },
] as const;

export default function CategoryEditor() {
  const { id, kind } = useLocalSearchParams<{ id: string; kind?: string }>();
  const all = useAllCategories();
  if (!all) return <LoadingScreen />;

  const existing = id === 'new' ? null : (all.find((c) => c.id === id) ?? null);
  // Built-in categories are not edited here (only hidden from the list).
  if (id !== 'new' && (!existing || existing.isSystem)) {
    router.back();
    return null;
  }
  const initial: CategoryInput = existing
    ? {
        name: existing.name,
        kind: existing.kind,
        icon: existing.icon,
        color: existing.color as CategoryInput['color'],
      }
    : { name: '', kind: kind === 'income' ? 'income' : 'expense', icon: 'other', color: 'blue' };

  return <CategoryForm existing={existing} initial={initial} all={all} />;
}

function CategoryForm({
  existing,
  initial,
  all,
}: {
  existing: Category | null;
  initial: CategoryInput;
  all: Category[];
}) {
  const { control, setValue, setError, handleSubmit, formState } = useForm<CategoryInput>({
    resolver: zodResolver(CategoryInputSchema),
    defaultValues: initial,
  });
  const values = useWatch({ control }) as CategoryInput;
  const { errors, isSubmitting } = formState;
  const set = <K extends Path<CategoryInput>>(key: K, value: PathValue<CategoryInput, K>) =>
    setValue(key, value, { shouldDirty: true, shouldValidate: formState.isSubmitted });
  const deleteSheet = useRef<SheetRef>(null);
  const [entryCount, setEntryCount] = useState(0);

  const save = async (input: CategoryInput) => {
    const name = input.name.trim();
    const taken = all.some(
      (c) =>
        c.kind === input.kind &&
        c.id !== existing?.id &&
        c.name.toLowerCase() === name.toLowerCase(),
    );
    if (taken) {
      setError('name', { message: `There is already a "${name}" category` });
      return;
    }
    if (existing) {
      await updateCategory(existing.id, { name, icon: input.icon, color: input.color });
    } else {
      await createCategory({ ...input, name });
    }
    router.back();
  };

  const askDelete = async () => {
    if (!existing) return;
    setEntryCount(await countCategoryEntries(existing.id));
    deleteSheet.current?.present();
  };

  return (
    <FormScreen title={existing ? 'Edit category' : 'New category'}>
      {existing ? null : (
        <SegmentedControl
          options={KINDS}
          value={values.kind}
          onChange={(k) => set('kind', k)}
          accessibilityLabel="Category type"
        />
      )}
      <TextField
        label="Name"
        value={values.name}
        onChangeText={(name) => set('name', name)}
        placeholder="e.g. Pets, Side hustle, Data bundles"
        maxLength={30}
        autoFocus={!existing}
        error={errors.name?.message}
      />
      <FieldCard label="Icon">
        <View style={styles.icons}>
          {CATEGORY_ICONS.map((icon) => {
            const selected = values.icon === icon;
            return (
              <PressableScale
                key={icon}
                onPress={() => set('icon', icon)}
                scaleTo={0.9}
                accessibilityRole="radio"
                accessibilityLabel={icon.replace(/-/g, ' ')}
                accessibilityState={{ selected }}
                style={[styles.iconChoice, selected && styles.iconSelected]}
              >
                <IconTile icon={icon} color={values.color} size={44} />
              </PressableScale>
            );
          })}
        </View>
      </FieldCard>
      <FieldCard label="Colour">
        <ColorSwatches value={values.color} onChange={(color) => set('color', color)} />
      </FieldCard>
      <Button
        label={existing ? 'Save category' : 'Add category'}
        onPress={handleSubmit(save)}
        loading={isSubmitting}
        block
      />
      {existing ? (
        <Button label="Delete category" variant="danger" icon="trash" onPress={askDelete} block />
      ) : null}

      {existing ? (
        <Sheet ref={deleteSheet} title={`Delete ${existing.name}?`}>
          <View style={styles.sheetBody}>
            <Text variant="body" tone="muted">
              {entryCount === 0
                ? 'No entries use it.'
                : `${entryCount} ${entryCount === 1 ? 'entry uses' : 'entries use'} it. ${
                    existing.kind === 'income'
                      ? 'They move to Other.'
                      : 'They become uncategorised.'
                  }`}{' '}
              Any budget for it is removed too.
            </Text>
            <Button
              label="Delete"
              variant="danger"
              block
              onPress={async () => {
                deleteSheet.current?.dismiss();
                await deleteCategory(existing);
                router.back();
              }}
            />
            <Button
              label="Keep it"
              variant="ghost"
              block
              onPress={() => deleteSheet.current?.dismiss()}
            />
          </View>
        </Sheet>
      ) : null}
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconChoice: { padding: 3, borderRadius: radius.tile + 3 },
  iconSelected: { boxShadow: `0 0 0 2px ${lightColors.primary}` },
  sheetBody: { paddingHorizontal: spacing.gutter, gap: spacing.md },
});
