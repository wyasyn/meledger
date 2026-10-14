import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { lightColors, spacing } from '@/theme/tokens';

import { IconTile } from './IconTile';

interface EmptyStateProps {
  icon: string;
  title: string;
  body?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  return (
    <View style={styles.root}>
      <IconTile icon={icon} color={lightColors.primary} size={56} round />
      <Text variant="titleMedium" style={styles.center}>
        {title}
      </Text>
      {body ? (
        <Text variant="bodyMedium" style={[styles.center, styles.body]}>
          {body}
        </Text>
      ) : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: spacing.sm, padding: spacing.xxl },
  center: { textAlign: 'center' },
  body: { color: lightColors.onSurfaceVariant },
});
