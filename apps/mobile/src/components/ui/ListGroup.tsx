import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { lightColors, radius, shadow, spacing } from '@/theme/tokens';

import { Icon } from './Icon';
import { IconTile } from './IconTile';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

interface ListGroupProps {
  /** Small caption above the group ("Preferences"). */
  title?: string;
  children: ReactNode;
}

/** White rounded group of rows (Paylix Settings), with hairline dividers inset past the icon. */
export function ListGroup({ title, children }: ListGroupProps) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.wrap}>
      {title ? (
        <Text variant="caption" tone="muted" accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      ) : null}
      <View style={styles.group}>
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 ? <View style={styles.divider} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Icon key and palette colour for the leading tile. */
  icon?: string;
  iconColor?: string;
  /** Text on the right (e.g. a balance). */
  value?: string;
  /** Custom trailing content (switch, badge). Defaults to a chevron when pressable. */
  trailing?: ReactNode;
  /** Shows a check instead of a chevron. */
  selected?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function ListRow({
  title,
  subtitle,
  icon,
  iconColor = 'slate',
  value,
  trailing,
  selected,
  onPress,
  accessibilityLabel,
}: ListRowProps) {
  const end =
    trailing ??
    (selected ? (
      <Icon name="check" weight="bold" size={20} color={lightColors.primary} />
    ) : onPress && selected === undefined ? (
      <Icon name="chevron-right" size={18} color={lightColors.onSurfaceVariant} />
    ) : null);

  const content = (
    <>
      {icon ? <IconTile icon={icon} color={iconColor} size={40} /> : null}
      <View style={styles.text}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="bodyStrong" style={styles.value}>
          {value}
        </Text>
      ) : null}
      {end}
    </>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.985}
      accessibilityRole="button"
      accessibilityState={selected !== undefined ? { selected } : undefined}
      accessibilityLabel={accessibilityLabel ?? [title, subtitle, value].filter(Boolean).join(', ')}
      style={styles.row}
    >
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  title: { paddingHorizontal: spacing.xs },
  group: {
    backgroundColor: lightColors.surface,
    borderRadius: radius.card,
    boxShadow: shadow.card,
    overflow: 'hidden',
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
    paddingVertical: spacing.md + 2,
    minHeight: 64,
  },
  text: { flex: 1, gap: 2 },
  value: { fontVariant: ['tabular-nums'] },
});
