import { router } from 'expo-router';
import { useMemo, useState } from 'react';

import { IconButton } from '@/components/ui/IconButton';
import { ListGroup, ListRow } from '@/components/ui/ListGroup';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Switch } from '@/components/ui/Switch';
import type { Category } from '@/db/schema';
import { setCategoryHidden, useAllCategories } from '@/features/categories/repo';
import { Note, SettingsPage } from '@/features/settings/components';

type Kind = 'expense' | 'income';

const KINDS = [
  { value: 'expense', label: 'Expenses' },
  { value: 'income', label: 'Income' },
] as const;

export default function CategoriesSettings() {
  const all = useAllCategories();
  const [kind, setKind] = useState<Kind>('expense');

  const groups = useMemo(() => {
    const byGroup = new Map<string, Category[]>();
    for (const c of all ?? []) {
      if (c.kind !== kind) continue;
      const list = byGroup.get(c.group);
      if (list) list.push(c);
      else byGroup.set(c.group, [c]);
    }
    return [...byGroup];
  }, [all, kind]);

  return (
    <SettingsPage
      title="Categories"
      right={
        <IconButton
          icon="plus"
          label="Add category"
          variant="dark"
          onPress={() =>
            router.push({ pathname: '/settings/categories/[id]', params: { id: 'new', kind } })
          }
        />
      }
    >
      <SegmentedControl
        options={KINDS}
        value={kind}
        onChange={setKind}
        accessibilityLabel="Category type"
      />
      <Note>
        Switch off the ones you never use; they leave the pickers but your past entries keep them.
        Tap one of your own to edit it.
      </Note>
      {groups.map(([group, list]) => (
        <ListGroup key={group} title={group}>
          {list.map((c) => (
            <ListRow
              key={c.id}
              title={c.name}
              subtitle={c.hidden ? 'Hidden' : undefined}
              icon={c.icon}
              iconColor={c.hidden ? 'slate' : c.color}
              onPress={
                c.isSystem
                  ? undefined
                  : () =>
                      router.push({ pathname: '/settings/categories/[id]', params: { id: c.id } })
              }
              trailing={
                <Switch
                  value={!c.hidden}
                  onValueChange={(shown) => void setCategoryHidden(c.id, !shown)}
                  accessibilityLabel={`Show ${c.name}`}
                />
              }
            />
          ))}
        </ListGroup>
      ))}
    </SettingsPage>
  );
}
