import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { type ReactNode, type Ref, type RefObject, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { lightColors, radius, spacing } from '@/theme/tokens';

import { IconButton } from './IconButton';
import { Text } from './Text';

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
  const close = () => (ref as RefObject<BottomSheetModal | null>)?.current?.dismiss();
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
      onDismiss={onDismiss}
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
