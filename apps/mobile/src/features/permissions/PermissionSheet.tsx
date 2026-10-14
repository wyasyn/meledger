import { type Ref, type RefObject, useEffect, useRef } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import type { IconName } from '@/components/ui/Icon';
import { IconTile } from '@/components/ui/IconTile';
import { Sheet, type SheetRef } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

import { type PermissionKind, usePermissionSheet } from './store';

const COPY: Record<PermissionKind, { icon: IconName; title: string; body: string }> = {
  microphone: {
    icon: 'mic',
    title: 'Turn on the microphone',
    body: 'MeLedger listens only while you talk to it, on your phone, and never keeps a recording. Allow the microphone in Settings to log by voice. You can always type instead.',
  },
  notifications: {
    icon: 'bell',
    title: 'Turn on notifications',
    body: 'Allow notifications in Settings to get your daily reminder and budget alerts.',
  },
  biometrics: {
    icon: 'fingerprint',
    title: 'Set up a fingerprint or face',
    body: 'Add a fingerprint or face unlock in your phone settings to lock MeLedger with it.',
  },
};

interface PermissionSheetProps {
  ref: Ref<SheetRef>;
  kind: PermissionKind;
  onDismiss?: () => void;
}

/** Explains a denied permission and links to the app's Android settings. Never prompts. */
export function PermissionSheet({ ref, kind, onDismiss }: PermissionSheetProps) {
  const copy = COPY[kind];
  const dismiss = () => (ref as RefObject<SheetRef | null>)?.current?.dismiss();
  return (
    <Sheet
      ref={ref}
      title=""
      onDismiss={onDismiss}
      footer={
        <View style={styles.actions}>
          <Button
            label="Open settings"
            block
            onPress={() => {
              dismiss();
              Linking.openSettings();
            }}
          />
          <Button label="Not now" variant="ghost" block onPress={dismiss} />
        </View>
      }
    >
      <View style={styles.body}>
        <IconTile icon={copy.icon} color="blue" size={64} round />
        <Text variant="title" align="center">
          {copy.title}
        </Text>
        <Text variant="body" tone="muted" align="center">
          {copy.body}
        </Text>
      </View>
    </Sheet>
  );
}

/**
 * App-wide host, mounted once in the root layout. Full-screen modals sit above the root
 * sheet layer, so they render their own PermissionSheet instead.
 */
export function PermissionSheetHost() {
  const kind = usePermissionSheet((s) => s.kind);
  const hide = usePermissionSheet((s) => s.hide);
  const ref = useRef<SheetRef>(null);

  useEffect(() => {
    if (kind) ref.current?.present();
  }, [kind]);

  return <PermissionSheet ref={ref} kind={kind ?? 'microphone'} onDismiss={hide} />;
}

const styles = StyleSheet.create({
  body: { alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xxl },
  actions: { gap: spacing.xs },
});
