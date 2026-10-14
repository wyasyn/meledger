import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { lightColors, spacing } from '@/theme/tokens';

import { IconTile } from './IconTile';
import { Text } from './Text';

interface EmptyStateProps {
  icon: string;
  title: string;
  body?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  return (
    <View style={styles.root}>
      <IconTile icon={icon} color={lightColors.primary} size={64} round />
      <View style={styles.text}>
        <Text variant="subtitle" align="center">
          {title}
        </Text>
        {body ? (
          <Text variant="body" tone="muted" align="center">
            {body}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.xxxl },
  text: { gap: spacing.xs, maxWidth: 300 },
});
