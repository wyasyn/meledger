import type { ReactNode, Ref } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { ListGroup, ListRow } from '@/components/ui/ListGroup';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Sheet, type SheetRef } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { lightColors, radius, shadow, spacing } from '@/theme/tokens';

/** A Settings sub-page: back button and title, then a scrolling column of groups. */
export function SettingsPage({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <ScreenHeader title={title} right={right} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

/** Small "Pro" pill with a lock, for features that arrive with MeLedger Pro. */
export function ProBadge() {
  return (
    <View style={styles.badge} accessibilityLabel="Pro feature">
      <Icon name="lock" weight="fill" size={12} color={lightColors.primary} />
      <Text variant="micro" style={styles.badgeText}>
        Pro
      </Text>
    </View>
  );
}

/** Grey explanation under a group. */
export function Note({ children }: { children: ReactNode }) {
  return (
    <Text variant="caption" tone="muted" style={styles.note}>
      {children}
    </Text>
  );
}

export interface Choice<T> {
  value: T;
  label: string;
  subtitle?: string;
}

/** A sheet listing options; the current one has a check. */
export function ChoiceSheet<T extends string | number>({
  ref,
  title,
  choices,
  value,
  onSelect,
}: {
  ref: Ref<SheetRef>;
  title: string;
  choices: readonly Choice<T>[];
  value: T;
  onSelect: (value: T) => void;
}) {
  return (
    <Sheet ref={ref} title={title}>
      <View style={styles.sheet}>
        <ListGroup>
          {choices.map((c) => (
            <ListRow
              key={String(c.value)}
              title={c.label}
              subtitle={c.subtitle}
              selected={c.value === value}
              onPress={() => onSelect(c.value)}
            />
          ))}
        </ListGroup>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.background },
  content: { paddingHorizontal: spacing.gutter, gap: spacing.xxl },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    height: 26,
    borderRadius: radius.pill,
    backgroundColor: lightColors.primaryContainer,
  },
  badgeText: { color: lightColors.primary },
  note: { paddingHorizontal: spacing.xs, marginTop: -spacing.lg },
  sheet: { paddingHorizontal: spacing.gutter },
  article: { gap: spacing.md },
  section: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: lightColors.surface,
    boxShadow: shadow.card,
  },
});

export interface ArticleSection {
  title: string;
  body: string;
}

/** A read-only page of short sections (Help, Privacy). */
export function Article({ sections }: { sections: readonly ArticleSection[] }) {
  return (
    <View style={styles.article}>
      {sections.map((s) => (
        <View key={s.title} style={styles.section}>
          <Text variant="subtitle" accessibilityRole="header">
            {s.title}
          </Text>
          <Text variant="body" tone="muted">
            {s.body}
          </Text>
        </View>
      ))}
    </View>
  );
}
