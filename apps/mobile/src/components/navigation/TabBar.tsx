import type { Tabs } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { Toast } from '@/components/ui/Toast';
import { openVoiceSheet, useVoiceHold } from '@/features/voice/store';
import { fontFamily } from '@/theme/fonts';
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
/** Below this width (dp) the bar tightens its margins and icons so the labels keep their room. */
const COMPACT_WIDTH = 360;

/**
 * Floating pill of tabs with the mic in its own circle on the right, drawn over the
 * screens. A fade to the background behind it keeps content from showing through below.
 */
export function TabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < COMPACT_WIDTH;
  const setHolding = useVoiceHold((s) => s.setHolding);
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
      <Toast bottom={bottom + PILL_HEIGHT + spacing.md} />
      <View style={[styles.row, compact && styles.rowCompact, { bottom }]}>
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
              <PressableScale
                key={route.key}
                onPress={onPress}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={spec.label}
                scaleTo={0.92}
                style={styles.item}
              >
                {/* Always rendered, only its opacity changes, so Android doesn't flatten
                    the view and drop its corner radius when it toggles. */}
                <View collapsable={false} style={[styles.itemTint, { opacity: focused ? 1 : 0 }]} />
                <Icon
                  name={spec.icon}
                  weight={focused ? 'fill' : 'regular'}
                  size={compact ? 22 : 24}
                  color={color}
                />
                {/* Shrinks rather than cutting off on narrow phones or with a large system font. */}
                <Text
                  variant="micro"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  maxFontSizeMultiplier={1.3}
                  color={color}
                  style={focused && styles.labelActive}
                >
                  {spec.label}
                </Text>
              </PressableScale>
            );
          })}
        </View>
        <MicFab
          onPress={() => openVoiceSheet()}
          onLongPress={() => {
            setHolding(true);
            openVoiceSheet();
          }}
          onPressOut={() => setHolding(false)}
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
  rowCompact: { left: spacing.md, right: spacing.md, gap: spacing.sm },
  pill: {
    flex: 1,
    flexDirection: 'row',
    height: PILL_HEIGHT,
    padding: 5,
    borderRadius: PILL_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: lightColors.outline,
    backgroundColor: lightColors.surface,
  },
  shadow: { boxShadow: '0 8px 24px rgba(0,0,0,0.12)' },
  item: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 2,
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
  labelActive: { fontFamily: fontFamily.bold },
});
