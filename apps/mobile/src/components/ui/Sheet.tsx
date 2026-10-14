import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
} from '@gorhom/bottom-sheet';
import { type ReactNode, type Ref, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { lightColors, spacing } from '@/theme/tokens';

export type SheetRef = BottomSheetModal;

interface SheetProps {
  ref: Ref<BottomSheetModal>;
  title: string;
  snapPoints?: (string | number)[];
  children: ReactNode;
}

/** Bottom sheet with a dimmed backdrop and a title, used for pickers. */
export function Sheet({ ref, title, snapPoints, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  const backdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
    ),
    [],
  );
  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enableDynamicSizing={!snapPoints}
      backdropComponent={backdrop}
      topInset={insets.top}
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={styles.background}
      handleIndicatorStyle={styles.handle}
    >
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
      {children}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  background: { backgroundColor: lightColors.surface, borderRadius: 24 },
  handle: { backgroundColor: lightColors.outline, width: 40 },
  title: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
});
