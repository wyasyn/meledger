import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import type { SheetRef } from '@/components/ui/Sheet';
import { PermissionSheet } from '@/features/permissions/PermissionSheet';
import { Orb, type OrbMode } from '@/features/voice/components/Orb';
import { useVoiceHold } from '@/features/voice/store';
import { useSpeechSession } from '@/features/voice/useSpeechSession';
import { lightColors, radius, shadow, spacing, tint } from '@/theme/tokens';

const MIC = 76;

/**
 * Talk to MeLedger: the orb listens and moves with your voice while the words appear live.
 * Opens listening. Turning speech into entries arrives with the voice milestone, so a finished
 * transcript can be carried into the manual form for now.
 */
export default function VoiceScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { status, transcript, level, error, start, stop } = useSpeechSession();
  const holding = useVoiceHold((s) => s.holding);
  const startedByHold = useRef(holding);
  const permissionSheet = useRef<SheetRef>(null);

  const listening = status === 'listening' || status === 'starting';
  const mode: OrbMode = listening
    ? 'listening'
    : status === 'done' && transcript
      ? 'thinking'
      : 'idle';
  const orbSize = Math.min(width * 0.86, 380);
  // The sphere is 70% of the orb canvas (see Orb); the ring sits just outside it.
  const ring = orbSize * 0.7 + 44;

  const begin = async () => {
    const result = await start();
    if (result === 'denied') permissionSheet.current?.present();
  };

  // Start listening as soon as the screen opens.
  useEffect(() => {
    begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hold-to-talk: releasing the tab bar mic stops listening.
  useEffect(() => {
    if (startedByHold.current && !holding) {
      startedByHold.current = false;
      stop();
    }
  }, [holding, stop]);

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (listening) stop();
    else begin();
  };

  const typeInstead = () =>
    router.replace({
      pathname: '/transaction/new',
      params: transcript ? { note: transcript } : {},
    });

  // The halo ring breathes with the voice.
  const halo = useDerivedValue(() => withSpring(level.get(), { damping: 14, stiffness: 90 }));
  const haloStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + halo.get() * 0.06 }],
    opacity: 0.55 + halo.get() * 0.45,
  }));
  const micGlow = useAnimatedStyle(() => ({
    transform: [{ scale: listening ? 1 + halo.get() * 0.35 : 1 }],
    opacity: listening ? 0.35 + halo.get() * 0.4 : 0,
  }));

  const heading =
    transcript ||
    (status === 'error'
      ? "I couldn't hear that"
      : listening
        ? "I'm listening…"
        : 'How can I help?');
  const hint =
    status === 'error'
      ? (error?.message ?? 'Something went wrong. Try again.')
      : listening
        ? 'Tap the mic when you are done'
        : status === 'done' && transcript
          ? 'Turning this into entries arrives soon. For now you can type it in.'
          : 'Say something like "lunch 12k cash"';

  return (
    <BottomSheetModalProvider>
      <View style={styles.root}>
        <LinearGradient
          colors={['#E3EEFF', lightColors.background]}
          locations={[0, 0.55]}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
          <IconButton icon="close" label="Close" variant="surface" onPress={() => router.back()} />
          <View style={styles.titleChip}>
            <Icon name="sparkle" weight="fill" size={14} color={lightColors.primary} />
            <Text variant="label">MeLedger</Text>
          </View>
          <View style={styles.spacer} />
        </View>

        <View style={styles.center}>
          <View style={{ width: orbSize, height: orbSize }}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.halo,
                {
                  width: ring,
                  height: ring,
                  borderRadius: ring / 2,
                  left: (orbSize - ring) / 2,
                  top: (orbSize - ring) / 2,
                },
                haloStyle,
              ]}
            />
            <Orb size={orbSize} mode={mode} level={level} />
          </View>

          <ScrollView
            style={styles.textBox}
            contentContainerStyle={styles.textContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View key={transcript ? 'speech' : heading} entering={FadeIn.duration(220)}>
              <Text
                variant={transcript ? 'title' : 'headline'}
                align="center"
                accessibilityLiveRegion="polite"
              >
                {heading}
              </Text>
            </Animated.View>
            <Text variant="caption" tone="muted" align="center">
              {hint}
            </Text>
          </ScrollView>
        </View>

        {status === 'done' && transcript ? (
          <Animated.View entering={FadeInDown.duration(260)} style={styles.result}>
            <Button label="Type it in" icon="keyboard" variant="secondary" onPress={typeInstead} />
          </Animated.View>
        ) : null}

        <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.xl }]}>
          <IconButton
            icon="keyboard"
            label="Type instead"
            variant="surface"
            size={56}
            onPress={typeInstead}
          />
          <View style={styles.micWrap}>
            <Animated.View pointerEvents="none" style={[styles.micGlow, micGlow]} />
            <PressableScale
              onPress={toggle}
              scaleTo={0.92}
              accessibilityRole="button"
              accessibilityLabel={listening ? 'Stop listening' : 'Start listening'}
              style={[styles.mic, listening && styles.micActive]}
            >
              <Icon
                name={listening ? 'stop' : 'mic'}
                weight="fill"
                size={30}
                color={listening ? lightColors.onPrimary : lightColors.surface}
              />
            </PressableScale>
          </View>
          <IconButton
            icon="close"
            label="Close"
            variant="surface"
            size={56}
            onPress={() => router.back()}
          />
        </View>
        <PermissionSheet ref={permissionSheet} kind="microphone" />
      </View>
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.background },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
  },
  titleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    height: 36,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: lightColors.surface,
    boxShadow: shadow.card,
  },
  spacer: { width: 44 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  halo: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: tint(lightColors.primary, 0.3),
  },
  textBox: { flexGrow: 0, maxHeight: 180, alignSelf: 'stretch' },
  textContent: { paddingHorizontal: spacing.xxxl, gap: spacing.sm },
  result: { alignItems: 'center', paddingBottom: spacing.lg },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  micWrap: { width: MIC, height: MIC, alignItems: 'center', justifyContent: 'center' },
  micGlow: {
    position: 'absolute',
    width: MIC,
    height: MIC,
    borderRadius: MIC / 2,
    backgroundColor: lightColors.primary,
  },
  mic: {
    width: MIC,
    height: MIC,
    borderRadius: MIC / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: lightColors.onSurface,
    boxShadow: shadow.raised,
  },
  micActive: {
    backgroundColor: lightColors.primary,
    boxShadow: `0 10px 30px ${tint(lightColors.primary, 0.45)}`,
  },
});
