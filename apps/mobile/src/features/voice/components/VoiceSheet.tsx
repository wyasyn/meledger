import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  type BottomSheetBackgroundProps,
  BottomSheetModal,
  BottomSheetView,
  useBottomSheet,
  useBottomSheetInternal,
  useBottomSheetModal,
  useBottomSheetTimingConfigs,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { showPermissionSheet } from '@/features/permissions/store';
import { lightColors, radius, shadow, spacing, tint } from '@/theme/tokens';

import { useVoiceHold, useVoiceSheet } from '../store';
import { useSpeechSession } from '../useSpeechSession';
import { Orb, type OrbMode } from './Orb';

const HALF = 0.62;
const MIC = 76;
const CONTROLS = MIC;
const HEADER = 56;

/** Mounted once in the root layout; the tab bar "+" opens it with openVoiceSheet(). */
export function VoiceSheetHost() {
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);
  const requestId = useVoiceSheet((s) => s.requestId);

  useEffect(() => {
    if (requestId > 0) ref.current?.present();
  }, [requestId]);

  // Smooth, intentional open and snap: eased timing, no bounce.
  const animationConfigs = useBottomSheetTimingConfigs({
    duration: 420,
    easing: Easing.out(Easing.cubic),
  });
  const backdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.3}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      name="voice"
      snapPoints={[`${HALF * 100}%`, '100%']}
      enableDynamicSizing={false}
      enablePanDownToClose
      topInset={insets.top}
      animationConfigs={animationConfigs}
      backdropComponent={backdrop}
      backgroundComponent={SheetBackground}
      handleIndicatorStyle={styles.handle}
    >
      <VoicePanel />
    </BottomSheetModal>
  );
}

function SheetBackground({ style }: BottomSheetBackgroundProps) {
  return (
    <View style={[style, styles.background]}>
      <LinearGradient
        colors={['#E3EEFF', lightColors.background]}
        locations={[0, 0.5]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

/**
 * Talk to MeLedger. Opens listening; the orb moves with the voice while the words appear.
 * Its parts are placed from the sheet's live position, so the controls always sit at the
 * visible bottom edge and the orb grows as the sheet is dragged to full height.
 */
function VoicePanel() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { animatedPosition } = useBottomSheet();
  const { animatedLayoutState } = useBottomSheetInternal();
  const { dismiss } = useBottomSheetModal();
  const { status, transcript, level, error, start, stop } = useSpeechSession();
  const holding = useVoiceHold((s) => s.holding);
  const startedByHold = useRef(holding);

  const listening = status === 'listening' || status === 'starting';
  const mode: OrbMode = listening
    ? 'listening'
    : status === 'done' && transcript
      ? 'thinking'
      : 'idle';
  const orbSize = Math.min(width * 0.8, 340);

  const begin = async () => {
    const result = await start();
    if (result === 'denied') showPermissionSheet('microphone');
  };

  // Start listening as soon as the sheet opens.
  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hold-to-talk: releasing the tab bar button stops listening.
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

  const typeInstead = () => {
    dismiss('voice');
    router.push({ pathname: '/transaction/new', params: transcript ? { note: transcript } : {} });
  };

  // What shows is the sheet container's height minus the sheet's live top position. At full
  // height the sheet starts below the status bar.
  const containerHeight = useDerivedValue(() => animatedLayoutState.get().containerHeight);
  const blockHeight = useSharedValue(0);
  const bottomPad = insets.bottom + spacing.xl;
  // Content starts below the drag handle, so positions inside it are offset by its height.
  const handleHeight = useDerivedValue(() => animatedLayoutState.get().handleHeight);
  const visible = useDerivedValue(() => containerHeight.get() - animatedPosition.get());
  const controlsTop = useDerivedValue(
    () => visible.get() - handleHeight.get() - CONTROLS - bottomPad,
  );

  const controlsStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: controlsTop.get() }],
  }));
  const blockStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      visible.get(),
      [containerHeight.get() * HALF, containerHeight.get() - insets.top],
      [0.7, 1],
      Extrapolation.CLAMP,
    );
    // Centre the orb and words between the header and the controls.
    const top = (HEADER + controlsTop.get()) / 2 - (blockHeight.get() * scale) / 2;
    return { transform: [{ translateY: top }, { scale }], transformOrigin: 'top' };
  });

  // The mic's glow breathes with the voice.
  const glow = useDerivedValue(() => withSpring(level.get(), { damping: 20, stiffness: 50 }));
  const micGlow = useAnimatedStyle(() => ({
    transform: [{ scale: listening ? 1 + glow.get() * 0.35 : 1 }],
    opacity: listening ? 0.35 + glow.get() * 0.4 : 0,
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
          : 'Say something like "lunch 12k cash", or tap the keyboard to type';

  return (
    <BottomSheetView style={styles.root}>
      <View style={styles.header}>
        <View style={styles.titleChip}>
          <Icon name="sparkle" weight="fill" size={14} color={lightColors.primary} />
          <Text variant="label">MeLedger</Text>
        </View>
      </View>

      <Animated.View
        style={[styles.block, blockStyle]}
        onLayout={(e) => blockHeight.set(e.nativeEvent.layout.height)}
      >
        <Orb size={orbSize} mode={mode} level={level} />
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
          {status === 'done' && transcript ? (
            <Animated.View entering={FadeInDown.duration(260)} style={styles.result}>
              <Button
                label="Type it in"
                icon="keyboard"
                variant="secondary"
                onPress={typeInstead}
              />
            </Animated.View>
          ) : null}
        </ScrollView>
      </Animated.View>

      <Animated.View style={[styles.controls, controlsStyle]}>
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
          onPress={() => dismiss('voice')}
        />
      </Animated.View>
    </BottomSheetView>
  );
}

const styles = StyleSheet.create({
  background: { borderRadius: radius.sheet, overflow: 'hidden' },
  handle: { backgroundColor: '#C9D3E3', width: 36, height: 5 },
  root: { flex: 1 },
  header: { height: HEADER, alignItems: 'center', justifyContent: 'center' },
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
  block: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
  textBox: { flexGrow: 0, maxHeight: 160, alignSelf: 'stretch' },
  textContent: { paddingHorizontal: spacing.xxxl, gap: spacing.sm },
  result: { alignItems: 'center', paddingTop: spacing.sm },
  controls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
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
