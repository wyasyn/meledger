import { createContext, type ReactNode, useContext } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SheetKeyboardScrollView } from '@/components/ui/SheetKeyboardScrollView';
import { lightColors, spacing } from '@/theme/tokens';

/**
 * Set inside the add sheet: forms render as the sheet's scrolling body, with the sheet's header
 * as a sticky first row (so the sheet's dynamic height includes it).
 */
export const InSheetContext = createContext<{ header: ReactNode } | null>(null);

/**
 * Stack screen for a Plan form: back button and title, keyboard-aware fields. Inside the add
 * sheet it is the sheet's scrolling body, under the sheet's own header.
 */
export function FormScreen({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const sheet = useContext(InSheetContext);
  const content = [styles.content, { paddingBottom: insets.bottom + spacing.xxl }];
  if (sheet) {
    return (
      <SheetKeyboardScrollView
        bottomOffset={spacing.xxl}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        stickyHeaderIndices={[0]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.sheetHeader}>{sheet.header}</View>
        <View style={styles.content}>{children}</View>
      </SheetKeyboardScrollView>
    );
  }
  return (
    <View style={styles.root}>
      <ScreenHeader title={title} right={right} />
      <KeyboardAwareScrollView
        bottomOffset={spacing.xxl}
        contentContainerStyle={content}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.background },
  sheetHeader: { backgroundColor: lightColors.background },
  // Top room so the first field's focus ring (drawn outside the card) isn't clipped.
  content: { paddingHorizontal: spacing.gutter, paddingTop: spacing.xs, gap: spacing.md },
});
