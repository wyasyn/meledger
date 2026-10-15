import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, BackHandler, StyleSheet, View } from 'react-native';
import Animated, { FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { updateProfile, useProfile } from '@/features/profile/repo';
import { lightColors, shadow, spacing } from '@/theme/tokens';

import { shouldLock } from './logic';
import { useLock } from './store';

/**
 * The biometric lock (build prompt section 12). Covers the whole app when it opens and when it
 * comes back after the lock delay, until the fingerprint, face or phone PIN is confirmed.
 */
export function LockGate() {
  const profile = useProfile();
  const enabled = !!profile?.onboardingDone && !!profile.biometricLock;
  const delay = profile?.lockDelay ?? 0;
  const locked = useLock((s) => s.locked);
  const coldStartChecked = useRef(false);

  // Lock on a cold start. Switching the lock on later in Settings does not lock right away.
  useEffect(() => {
    if (profile === undefined || coldStartChecked.current) return;
    coldStartChecked.current = true;
    if (enabled) useLock.getState().set({ locked: true });
  }, [profile, enabled]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const lock = useLock.getState();
      if (lock.authenticating) return;
      if (state === 'background') {
        lock.set({ backgroundAt: Date.now() });
      } else if (state === 'active') {
        if (enabled && shouldLock(lock.backgroundAt, Date.now(), delay)) lock.set({ locked: true });
        lock.set({ backgroundAt: null });
      }
    });
    return () => sub.remove();
  }, [enabled, delay]);

  if (!enabled || !locked) return null;
  return <LockScreen />;
}

function LockScreen() {
  const insets = useSafeAreaInsets();
  const authenticating = useLock((s) => s.authenticating);

  const unlock = useCallback(async () => {
    const lock = useLock.getState();
    if (lock.authenticating) return;
    // Nothing on the phone can confirm it is the owner any more (fingerprints and screen lock
    // removed): the lock cannot work, so it switches itself off rather than locking them out.
    if (
      (await LocalAuthentication.getEnrolledLevelAsync()) === LocalAuthentication.SecurityLevel.NONE
    ) {
      await updateProfile({ biometricLock: false });
      lock.set({ locked: false });
      return;
    }
    lock.set({ authenticating: true });
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock MeLedger',
        cancelLabel: 'Cancel',
      });
      if (result.success) useLock.getState().set({ locked: false });
    } finally {
      useLock.getState().set({ authenticating: false, backgroundAt: null });
    }
  }, []);

  // Ask straight away; the button is there if the prompt is cancelled.
  useEffect(() => {
    void unlock();
  }, [unlock]);

  // Back leaves the app instead of reaching the screens underneath.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      BackHandler.exitApp();
      return true;
    });
    return () => sub.remove();
  }, []);

  return (
    <Animated.View
      exiting={FadeOut.duration(200)}
      style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xxl }]}
      accessibilityViewIsModal
    >
      <View style={styles.center}>
        <View style={styles.badge}>
          <Icon name="lock" weight="fill" size={36} color={lightColors.primary} />
        </View>
        <Text variant="headline" align="center">
          MeLedger is locked
        </Text>
        <Text variant="body" tone="muted" align="center">
          Use your fingerprint, face or phone PIN to open it.
        </Text>
      </View>
      <Button
        label="Unlock"
        icon="fingerprint"
        onPress={unlock}
        loading={authenticating}
        block
        style={styles.button}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    backgroundColor: lightColors.background,
    paddingHorizontal: spacing.gutter,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  badge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: lightColors.surface,
    boxShadow: shadow.card,
    marginBottom: spacing.lg,
  },
  button: { marginHorizontal: spacing.lg },
});
