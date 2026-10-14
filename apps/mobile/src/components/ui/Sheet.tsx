import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
  useBottomSheetTimingConfigs,
} from '@gorhom/bottom-sheet';
import { type ReactNode, type Ref, type RefObject, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { lightColors, radius, spacing } from '@/theme/tokens';

import { IconButton } from './IconButton';
import { Text } from './Text';
import { useSheetBackHandler } from './useSheetBackHandler';

export type SheetRef = BottomSheetModal;

interface SheetProps {
  ref: Ref<BottomSheetModal>;
  title: string;
  /** Fixed heights for scrolling content; without them the sheet sizes to its content. */
  snapPoints?: (string | number)[];
  /** Pinned under the content (e.g. an Apply button). Only for content-sized sheets. */
  footer?: ReactNode;
  /** With snapPoints, pass a BottomSheet scrollable; otherwise plain views. */
  children: ReactNode;
  onDismiss?: () => void;
}

/** Bottom sheet: large radius, slim handle, title with a close button, dimmed backdrop. */
export function Sheet({ ref, title, snapPoints, footer, children, onDismiss }: SheetProps) {
  const insets = useSafeAreaInsets();
  // One curve for opening, snapping and closing: eases in and out, so it never starts or
  // stops abruptly, and never bounces.
  const animationConfigs = useBottomSheetTimingConfigs({
    duration: 420,
    easing: Easing.inOut(Easing.cubic),
  });
  const backdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.32}
        pressBehavior="close"
      />
    ),
    [],
  );
  const sheetRef = ref as RefObject<BottomSheetModal | null>;
  const close = () => sheetRef?.current?.dismiss();
  const back = useSheetBackHandler(sheetRef);
  const heading = (
    <View style={styles.header}>
      <Text variant="title" accessibilityRole="header" style={styles.flex}>
        {title}
      </Text>
      <IconButton icon="close" label="Close" variant="surface" size={36} onPress={close} />
    </View>
  );
  const bottom = { paddingBottom: insets.bottom + spacing.lg };
  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enableDynamicSizing={!snapPoints}
      backdropComponent={backdrop}
      animationConfigs={animationConfigs}
      onChange={back.onChange}
      onDismiss={() => {
        back.onDismiss();
        onDismiss?.();
      }}
      // Pickers opened from another sheet (e.g. the voice sheet's cards) stack on top of it;
      // the default "switch" minimizes the parent, which unmounts the picker with it.
      stackBehavior="push"
      topInset={insets.top + spacing.sm}
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
    >
      {snapPoints ? (
        <>
          {heading}
          {children}
        </>
      ) : (
        // Dynamic sizing measures a single BottomSheetView, so the title must sit inside it.
        <BottomSheetView style={bottom}>
          {heading}
          {children}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </BottomSheetView>
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  background: { backgroundColor: lightColors.background, borderRadius: radius.sheet },
  handle: { backgroundColor: '#D4D4D8', width: 36, height: 5 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  flex: { flex: 1 },
  footer: { paddingHorizontal: spacing.gutter, paddingTop: spacing.lg },
});
