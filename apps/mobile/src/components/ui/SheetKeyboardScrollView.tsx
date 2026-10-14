import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewProps,
} from 'react-native-keyboard-controller';

type ScrollViewComponent = NonNullable<KeyboardAwareScrollViewProps['ScrollViewComponent']>;

/**
 * A bottom sheet scroll view that also scrolls the focused field above the keyboard.
 * KeyboardAwareScrollView renders the sheet's own BottomSheetScrollView (its documented
 * ScrollViewComponent prop), so the sheet keeps its scroll and drag handling. The
 * createBottomSheetScrollableComponent recipe wrapped the other way round did not scroll on
 * @gorhom/bottom-sheet 5.2.
 */
export function SheetKeyboardScrollView(props: KeyboardAwareScrollViewProps) {
  return (
    <KeyboardAwareScrollView
      ScrollViewComponent={BottomSheetScrollView as unknown as ScrollViewComponent}
      {...props}
    />
  );
}
