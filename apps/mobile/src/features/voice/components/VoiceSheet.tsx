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
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { LinearGradient } from 'expo-linear-gradient';
import { formatMoney, localParse, type ParseResult } from '@meledger/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useSheetBackHandler } from '@/components/ui/useSheetBackHandler';
import { showPermissionSheet } from '@/features/permissions/store';
import { useLedger, useLedgerData } from '@/features/transactions/useLedgerData';
import { mainWalletId } from '@/features/wallets/logic';
import { lightColors, radius, shadow, spacing, tint } from '@/theme/tokens';

import {
  type Answer,
  answerQuestion,
  blankDraft,
  buildParseContext,
  draftFromInput,
  toDraft,
  type VoiceDraft,
} from '../logic';
import { useVoiceHold, useVoiceSheet } from '../store';
import { useSpeechSession } from '../useSpeechSession';
import { loadVocabulary } from '../vocabulary';
import { Orb, type OrbMode } from './Orb';
import { VoiceReview } from './VoiceReview';

const HALF = 0.62;
const MIC = 76;
const CONTROLS = MIC;
const HEADER = 56;
/** How long the orb "thinks" before the result shows, so the change never feels abrupt. */
const THINK_MS = 600;

/** What the sheet shows after listening. */
type Outcome =
  | { kind: 'none' }
  | { kind: 'review'; drafts: VoiceDraft[]; mode: 'voice' | 'typed' | 'edit' }
  | { kind: 'answer'; answer: Answer }
  | { kind: 'notice'; title: string; body: string; typeIt?: boolean };

const COMING_SOON: Record<string, { title: string; body: string }> = {
  set_budget: {
    title: 'Budgets are coming soon',
    body: 'Setting a budget by voice arrives with the Plan tab.',
  },
  set_goal: {
    title: 'Goals are coming soon',
    body: 'Creating a goal by voice arrives with the Plan tab.',
  },
  contribute_goal: {
    title: 'Goals are coming soon',
    body: 'Adding to a goal by voice arrives with the Plan tab.',
  },
  add_reminder: {
    title: 'Reminders are coming soon',
    body: 'Setting a reminder by voice arrives in a later update.',
  },
};

/**
 * Mounted once in the root layout. openVoiceSheet() opens it listening; openEntrySheet(id)
 * opens an existing entry as an editable card, straight at full height.
 */
export function VoiceSheetHost() {
  const insets = useSafeAreaInsets();
  const ref = useRef<BottomSheetModal>(null);
  const requestId = useVoiceSheet((s) => s.requestId);
  const editing = useVoiceSheet((s) => s.request.mode === 'edit');
  const back = useSheetBackHandler(ref);

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
      index={editing ? 1 : 0}
      enableDynamicSizing={false}
      enablePanDownToClose
      onChange={back.onChange}
      // Dragging down, tapping outside or Back must also stop the microphone.
      onDismiss={() => {
        back.onDismiss();
        ExpoSpeechRecognitionModule.abort();
      }}
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
  const { animatedPosition, snapToIndex } = useBottomSheet();
  const { animatedLayoutState, animatedDetentsState } = useBottomSheetInternal();
  const { dismiss } = useBottomSheetModal();
  const { status, transcript, level, error, start, stop, cancel } = useSpeechSession();
  const holding = useVoiceHold((s) => s.holding);
  const startedByHold = useRef(holding);
  const data = useLedgerData();
  const ledger = useLedger(data);
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'none' });
  // What this opening is for; fixed for the sheet's lifetime (it unmounts on dismiss).
  const [request] = useState(() => useVoiceSheet.getState().request);
  const editing = request.mode === 'edit';

  // The wallet for lines that name none: Home's wallet filter when it opened with one.
  const preferredWallet = useMemo(() => {
    if (!data) return null;
    const asked = request.mode === 'listen' ? request.walletId : null;
    const usable = data.wallets.some((w) => w.id === asked && !w.archived);
    return usable ? asked : mainWalletId(data.wallets);
  }, [data, request]);

  // Editing opens on the entry's card: derived from the entry until the first change, which
  // moves it into state. Read once, so live updates never reset what is being edited.
  const loaded = data !== undefined;
  const editOutcome = useMemo((): Outcome | null => {
    if (request.mode !== 'edit' || !data) return null;
    const tx = data.transactions.find((t) => t.id === request.transactionId);
    if (!tx) {
      return {
        kind: 'notice',
        title: 'This entry no longer exists',
        body: 'It may have been deleted.',
      };
    }
    const draft = draftFromInput(tx.id, {
      type: tx.type,
      amount: tx.amount,
      walletId: tx.walletId,
      toWalletId: tx.toWalletId,
      categoryId: tx.categoryId,
      occurredAt: tx.occurredAt,
      note: tx.note ?? '',
      feeAmount: tx.feeAmount,
      tagIds: data.tagIdsByTransaction.get(tx.id) ?? [],
    });
    return { kind: 'review', drafts: [draft], mode: 'edit' };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, loaded]);
  const shown: Outcome = outcome.kind === 'none' && editOutcome ? editOutcome : outcome;

  const listening = status === 'listening' || status === 'starting';
  // Between the end of listening and the parsed result, the orb shows it is working.
  const finished = status === 'done' && transcript.trim() !== '' && data !== undefined;
  const thinking = finished && outcome.kind === 'none';
  const mode: OrbMode = listening ? 'listening' : thinking ? 'thinking' : 'idle';

  const outcomeFor = (result: ParseResult, now: Date): Outcome => {
    if (result.intent === 'log' && result.items.length > 0 && data) {
      const stamp = Date.now();
      return {
        kind: 'review',
        mode: 'voice',
        drafts: result.items.map((item, i) => toDraft(item, `${stamp}-${i}`, preferredWallet, now)),
      };
    }
    if (result.intent === 'question') {
      if (!result.question || !data || !ledger) {
        return {
          kind: 'notice',
          title: "I can't answer that one yet",
          body: 'Ask how much you spent or earned, what you spent most on, or your balance.',
        };
      }
      const transactions = data.transactions.map((tx, i) => ({
        ...ledger.entries[i]!,
        categoryId: tx.categoryId,
      }));
      const wallets = data.wallets.filter((w) => !w.archived);
      return {
        kind: 'answer',
        answer: answerQuestion(
          result.question,
          { transactions, categories: data.categories, wallets, balances: ledger.balances },
          now,
        ),
      };
    }
    const soon = COMING_SOON[result.intent];
    if (soon) return { kind: 'notice', ...soon };
    return {
      kind: 'notice',
      title: "I didn't catch an amount",
      body: 'Try something like "lunch 12k cash", or type it in.',
      typeIt: true,
    };
  };

  // When listening ends with words, parse them on the device (build prompt section 6).
  useEffect(() => {
    if (!finished || !data || !ledger) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const now = new Date();
      const vocabulary = await loadVocabulary();
      const ctx = buildParseContext(
        data.wallets,
        data.categories,
        vocabulary,
        now,
        preferredWallet,
      );
      const result = localParse(transcript, ctx);
      if (!cancelled) setOutcome(outcomeFor(result, now));
    }, THINK_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Parse once per finished session; later data changes must not re-run it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  // The cards need room: ease up to full height to review them.
  const reviewing = outcome.kind === 'review';
  useEffect(() => {
    if (reviewing) snapToIndex(1);
  }, [reviewing, snapToIndex]);
  const orbSize = Math.min(width * 0.8, 340);

  const begin = async () => {
    const result = await start();
    if (result === 'denied') showPermissionSheet('microphone');
  };

  // Start listening as soon as the sheet opens (not when it opens to edit an entry).
  useEffect(() => {
    if (editing) return;
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
    else {
      setOutcome({ kind: 'none' });
      begin();
    }
  };

  const close = () => {
    cancel();
    dismiss('voice');
  };

  // Typing opens the same card in this sheet; anything already said becomes the note.
  const typeInstead = () => {
    if (!data) return;
    cancel();
    const draft = blankDraft(String(Date.now()), preferredWallet, new Date(), transcript);
    setOutcome({ kind: 'review', drafts: [draft], mode: 'typed' });
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

  const canvasStyle = useAnimatedStyle(() => ({
    height: containerHeight.get() - insets.top - handleHeight.get(),
  }));
  // The cards keep their full-height layout while the sheet moves (relaying them out every frame
  // flickers). Only the Save bar slides, by transform, to stay on the visible bottom edge; how
  // far the sheet sits below full height is how far it moves up.
  // Visible height at the top snap point (the sheet's own value; the container may or may not
  // include the status bar inset, so it is not derived from insets).
  const fullVisible = useDerivedValue(
    () => containerHeight.get() - (animatedDetentsState.get().highestDetentPosition ?? insets.top),
  );
  const reviewStyle = useAnimatedStyle(() => ({
    height: fullVisible.get() - handleHeight.get(),
  }));
  const hidden = useDerivedValue(() => fullVisible.get() - visible.get());
  const footerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.max(0, hidden.get()) }],
  }));
  // Fixed room at the end of the list, as tall as the part of the sheet hidden at its lower
  // height, so the last fields can still scroll above the Save bar there. It depends only on
  // the snap points, so nothing in the list changes while the sheet moves or settles.
  const spacerStyle = useAnimatedStyle(() => {
    const { detents, highestDetentPosition } = animatedDetentsState.get();
    const lowest = detents && detents.length > 0 ? Math.max(...detents) : 0;
    return { height: Math.max(0, lowest - (highestDetentPosition ?? lowest)) };
  });
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
    shown.kind === 'answer'
      ? shown.answer.text
      : shown.kind === 'notice'
        ? shown.title
        : transcript ||
          (status === 'error'
            ? "I couldn't hear that"
            : listening
              ? "I'm listening…"
              : 'How can I help?');
  const hint =
    shown.kind === 'answer' || (shown.kind === 'notice' && shown.typeIt)
      ? `You said: "${transcript}"`
      : shown.kind === 'notice'
        ? shown.body
        : status === 'error'
          ? (error?.message ?? 'Something went wrong. Try again.')
          : listening
            ? 'Tap the mic when you are done'
            : thinking
              ? 'Working it out…'
              : 'Say something like "lunch 12k cash", or tap the keyboard to type';

  if (shown.kind === 'review' && data) {
    return (
      <BottomSheetView style={styles.root}>
        <Animated.View style={[styles.review, reviewStyle]}>
          <VoiceReview
            footerStyle={footerStyle}
            spacerStyle={spacerStyle}
            transcript={shown.mode === 'voice' ? transcript : ''}
            mode={shown.mode}
            editId={request.mode === 'edit' ? request.transactionId : undefined}
            drafts={shown.drafts}
            data={data}
            onDrafts={(drafts) => setOutcome({ ...shown, drafts })}
            onDone={close}
          />
        </Animated.View>
      </BottomSheetView>
    );
  }

  return (
    <BottomSheetView style={styles.root}>
      {/* Fixed at the full sheet height: the sheet's own view resizes while dragging, and
          anything outside its bounds would blink out. */}
      <Animated.View style={[styles.canvas, canvasStyle]}>
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
            {shown.kind === 'answer' && shown.answer.rows.length > 0 ? (
              <Animated.View entering={FadeInDown.duration(260)} style={styles.rows}>
                {shown.answer.rows.map((row) => (
                  <View key={row.label} style={styles.answerRow}>
                    <Text variant="body" style={styles.flex} numberOfLines={1}>
                      {row.label}
                    </Text>
                    <Text variant="label">{formatMoney(row.amount)}</Text>
                  </View>
                ))}
              </Animated.View>
            ) : null}
            {shown.kind === 'notice' && shown.typeIt ? (
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
          <IconButton icon="close" label="Close" variant="surface" size={56} onPress={close} />
        </Animated.View>
      </Animated.View>
    </BottomSheetView>
  );
}

const styles = StyleSheet.create({
  background: { borderRadius: radius.sheet, overflow: 'hidden' },
  handle: { backgroundColor: '#C9D3E3', width: 36, height: 5 },
  root: { flex: 1, overflow: 'visible' },
  canvas: { overflow: 'visible' },
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
  review: { overflow: 'hidden' },
  rows: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.field,
    backgroundColor: lightColors.surface,
    boxShadow: shadow.card,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  flex: { flex: 1 },
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
