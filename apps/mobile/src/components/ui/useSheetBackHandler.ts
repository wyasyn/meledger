import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { type RefObject, useCallback, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';

/**
 * Android Back closes the sheet while it is open, instead of leaving the screen or the app.
 * React Native calls the newest back handler first, so a sheet opened on top of another (a
 * picker over the voice sheet) closes first. Pass `onChange` and `onDismiss` to the sheet.
 */
export function useSheetBackHandler(ref: RefObject<BottomSheetModal | null>) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      ref.current?.dismiss();
      return true;
    });
    return () => subscription.remove();
  }, [open, ref]);

  const onChange = useCallback((index: number) => setOpen(index >= 0), []);
  const onDismiss = useCallback(() => setOpen(false), []);
  return { onChange, onDismiss };
}
