import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { lightColors, motion, radius, shadow, spacing } from '@/theme/tokens';

/** Step order; each is a route under /onboarding. */
export const ONBOARDING_STEPS = [
  'index',
  'voice',
  'language',
  'wallets',
  'income',
  'goal',
  'try',
  'reminders',
] as const;
export type OnboardingStepName = (typeof ONBOARDING_STEPS)[number];

/** Goes to the step after `step`. */
export function nextStep(step: OnboardingStepName) {
  const next = ONBOARDING_STEPS[ONBOARDING_STEPS.indexOf(step) + 1];
  if (next && next !== 'index') router.push(`/onboarding/${next}`);
}

interface OnboardingStepProps {
  step: OnboardingStepName;
  /** Icon shown in a white circle, unless `hero` replaces it. */
  icon?: IconName;
  hero?: ReactNode;
  title: string;
  body?: string;
  children?: ReactNode;
  primary: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean };
  /** Quiet text button under the primary one ("Skip", "I'll type instead"). */
  secondary?: { label: string; onPress: () => void };
}

/**
 * Onboarding page in the "Use your voice" inspiration's structure, in the light theme:
 * centred icon or hero, bold title, grey body, page dots and a Continue pill.
 */
export function OnboardingStep({
  step,
  icon,
  hero,
  title,
  body,
  children,
  primary,
  secondary,
}: OnboardingStepProps) {
  const insets = useSafeAreaInsets();
  const index = ONBOARDING_STEPS.indexOf(step);

  return (
    <KeyboardAvoidingView style={styles.root} behavior="padding">
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        {index > 0 ? (
          <IconButton icon="back" label="Back" variant="surface" onPress={() => router.back()} />
        ) : (
          <View style={styles.topSpacer} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(motion.slow)} style={styles.head}>
          {hero ??
            (icon ? (
              <View style={styles.iconCircle}>
                <Icon name={icon} weight="fill" size={36} color={lightColors.primary} />
              </View>
            ) : null)}
          <Text variant="headline" align="center" accessibilityRole="header">
            {title}
          </Text>
          {body ? (
            <Text variant="body" tone="muted" align="center" style={styles.body}>
              {body}
            </Text>
          ) : null}
        </Animated.View>
        {children ? (
          <Animated.View
            entering={FadeInDown.duration(motion.slow).delay(80)}
            style={styles.children}
          >
            {children}
          </Animated.View>
        ) : null}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View
          style={styles.dots}
          accessible
          accessibilityLabel={`Step ${index + 1} of ${ONBOARDING_STEPS.length}`}
        >
          {ONBOARDING_STEPS.map((s, i) => (
            <View key={s} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Button
          label={primary.label}
          onPress={primary.onPress}
          disabled={primary.disabled}
          loading={primary.loading}
          block
        />
        {secondary ? (
          <Button label={secondary.label} variant="ghost" size="sm" onPress={secondary.onPress} />
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.background },
  top: { paddingHorizontal: spacing.gutter },
  topSpacer: { height: 44 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.xxl,
    gap: spacing.xxl,
  },
  head: { alignItems: 'center', gap: spacing.md },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: lightColors.surface,
    boxShadow: shadow.raised,
    marginBottom: spacing.md,
  },
  body: { maxWidth: 330 },
  children: { gap: spacing.md },
  bottom: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  dots: { flexDirection: 'row', gap: 6, marginBottom: spacing.sm },
  dot: { width: 6, height: 6, borderRadius: radius.pill, backgroundColor: '#D4D4D8' },
  dotActive: { width: 20, backgroundColor: lightColors.primary },
});
