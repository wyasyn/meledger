import { router, type Tabs } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Snackbar, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { showSnackbar, useSnackbar } from '@/features/feedback/snackbar';
import { lightColors, spacing, tint } from '@/theme/tokens';

import { MIC_FAB_SIZE, MicFab } from './MicFab';
import { TABS } from './tabs';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/** Height of the floating pill (and of the mic circle beside it). */
const PILL_HEIGHT = MIC_FAB_SIZE;
/** Gap between the pill and the bottom safe area. */
const PILL_GAP = spacing.sm;
/** Space the bar takes above the bottom safe area. Tab screens pad their content by this. */
export const TAB_BAR_HEIGHT = PILL_HEIGHT + PILL_GAP;
/** How far the fade behind the bar reaches above it. */
const FADE_EXTRA = 40;

/**
 * Floating pill of tabs with the mic in its own circle on the right, drawn over the
 * screens. A fade to the background behind it keeps content from showing through below.
 */
export function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const snackbar = useSnackbar((s) => s.current);
  const dismissSnackbar = useSnackbar((s) => s.dismiss);
  const bottom = insets.bottom + PILL_GAP;

  return (
    <>
      <View
        pointerEvents="none"
        style={[styles.fade, { height: insets.bottom + TAB_BAR_HEIGHT + FADE_EXTRA }]}
      >
        <LinearGradient
          colors={[
            tint(lightColors.background, 0),
            tint(lightColors.background, 0.8),
            lightColors.background,
          ]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <Snackbar
        key={snackbar?.key}
        visible={snackbar !== null}
        onDismiss={dismissSnackbar}
        duration={snackbar?.duration ?? 3000}
        action={snackbar?.action}
        wrapperStyle={[styles.snackbar, { bottom: bottom + PILL_HEIGHT }]}
      >
        {snackbar?.message ?? ''}
      </Snackbar>
      <View style={[styles.row, { bottom }]}>
        <View style={[styles.pill, styles.shadow]}>
          {state.routes.map((route, index) => {
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
              if (!focused && !event.defaultPrevented)
                navigation.navigate(route.name, route.params);
            };

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={spec.label}
                android_ripple={{ color: lightColors.primaryContainer, borderless: true }}
                style={styles.item}
              >
                {/* Always rendered, only its opacity changes, so Android doesn't flatten
                    the view and drop its corner radius when it toggles. */}
                <View collapsable={false} style={[styles.itemTint, { opacity: focused ? 1 : 0 }]} />
                <Icon name={focused ? spec.activeIcon : spec.icon} size={24} color={color} />
                <Text
                  variant="labelSmall"
                  numberOfLines={1}
                  style={[{ color }, focused && styles.labelActive]}
                >
                  {spec.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {/* Until the voice sheet (milestone 3) has its keyboard button, tap opens manual entry. */}
        <MicFab
          onPress={() => router.push('/transaction/new')}
          onLongPress={() => showSnackbar({ message: 'Hold to talk arrives in milestone 3' })}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  row: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    height: PILL_HEIGHT,
    padding: 5,
    borderRadius: PILL_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: lightColors.outline,
    backgroundColor: tint(lightColors.surface, 0.94),
  },
  shadow: { boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: (PILL_HEIGHT - 10) / 2,
    overflow: 'hidden',
  },
  itemTint: {
    ...StyleSheet.absoluteFill,
    borderRadius: (PILL_HEIGHT - 10) / 2,
    backgroundColor: tint(lightColors.onSurface, 0.08),
  },
  labelActive: { fontFamily: 'Inter_600SemiBold' },
  snackbar: { position: 'absolute', left: 0, right: 0, marginBottom: spacing.sm },
});
