import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, type Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Snackbar, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { showSnackbar, useSnackbar } from '@/features/feedback/snackbar';
import { lightColors, spacing } from '@/theme/tokens';

import { MicFab } from './MicFab';
import { TABS } from './tabs';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const FAB_SLOT_AFTER = 1; // FAB sits after the second tab (Home, Report | mic | Plan, Settings)

export function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const snackbar = useSnackbar((s) => s.current);
  const dismissSnackbar = useSnackbar((s) => s.dismiss);

  const items = state.routes.map((route, index) => {
    const spec = TABS[route.name];
    if (!spec) return null;
    const focused = state.index === index;
    const color = focused ? lightColors.onSurface : lightColors.onSurfaceVariant;

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
    };

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={spec.label}
        android_ripple={{ color: lightColors.primaryContainer, borderless: true, radius: 36 }}
        style={styles.item}
      >
        <MaterialCommunityIcons
          name={focused ? spec.activeIcon : spec.icon}
          size={24}
          color={color}
        />
        <Text
          variant="labelMedium"
          style={[styles.label, { color }, focused && styles.labelActive]}
        >
          {spec.label}
        </Text>
      </Pressable>
    );
  });

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.sm }]}>
      <Snackbar
        key={snackbar?.key}
        visible={snackbar !== null}
        onDismiss={dismissSnackbar}
        duration={snackbar?.duration ?? 3000}
        action={snackbar?.action}
        wrapperStyle={styles.snackbar}
      >
        {snackbar?.message ?? ''}
      </Snackbar>
      <View style={styles.row}>
        {items.slice(0, FAB_SLOT_AFTER + 1)}
        <View style={styles.fabSlot}>
          {/* Until the voice sheet (milestone 3) has its keyboard button, tap opens manual entry. */}
          <MicFab
            onPress={() => router.push('/transaction/new')}
            onLongPress={() => showSnackbar({ message: 'Hold to talk arrives in milestone 3' })}
          />
        </View>
        {items.slice(FAB_SLOT_AFTER + 1)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: lightColors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: lightColors.outline,
    paddingTop: spacing.md,
    elevation: 8,
    shadowColor: '#000000',
  },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  item: { flex: 1, alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  label: {},
  labelActive: { fontFamily: 'Inter_600SemiBold' },
  fabSlot: { flex: 1, alignItems: 'center' },
  // Sits above the FAB, which overhangs the bar by about 40dp.
  snackbar: { position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 44 },
});
