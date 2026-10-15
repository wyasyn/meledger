import * as LocalAuthentication from 'expo-local-authentication';
import { useRef } from 'react';

import { ListGroup, ListRow } from '@/components/ui/ListGroup';
import type { SheetRef } from '@/components/ui/Sheet';
import { Switch } from '@/components/ui/Switch';
import { showPermissionSheet } from '@/features/permissions/store';
import { updateProfile, useProfile } from '@/features/profile/repo';
import { LOCK_DELAYS, lockDelayLabel } from '@/features/security/logic';
import { useLock } from '@/features/security/store';
import { ChoiceSheet, Note, SettingsPage } from '@/features/settings/components';

const DELAY_CHOICES = LOCK_DELAYS.map((m) => ({ value: m, label: lockDelayLabel(m) }));

/** Confirms it's the owner (the system prompt itself is not a permission request). */
async function confirmOwner(promptMessage: string): Promise<boolean> {
  const lock = useLock.getState();
  lock.set({ authenticating: true });
  try {
    return (await LocalAuthentication.authenticateAsync({ promptMessage })).success;
  } finally {
    useLock.getState().set({ authenticating: false });
  }
}

export default function SecuritySettings() {
  const profile = useProfile();
  const delaySheet = useRef<SheetRef>(null);
  if (!profile) return <SettingsPage title="Security">{null}</SettingsPage>;

  const toggleLock = async (on: boolean) => {
    if (on) {
      const ready =
        (await LocalAuthentication.hasHardwareAsync()) &&
        (await LocalAuthentication.isEnrolledAsync());
      if (!ready) {
        showPermissionSheet('biometrics');
        return;
      }
    }
    if (await confirmOwner(on ? 'Turn on the app lock' : 'Turn off the app lock')) {
      await updateProfile({ biometricLock: on });
    }
  };

  return (
    <SettingsPage title="Security">
      <ListGroup title="App lock">
        <ListRow
          title="Lock with fingerprint"
          subtitle="Fingerprint, face or PIN to open"
          icon="fingerprint"
          iconColor="blue"
          trailing={
            <Switch
              value={profile.biometricLock}
              onValueChange={toggleLock}
              accessibilityLabel="Lock with fingerprint"
            />
          }
        />
        {profile.biometricLock ? (
          <ListRow
            title="Lock"
            icon="clock"
            iconColor="teal"
            value={lockDelayLabel(profile.lockDelay)}
            onPress={() => delaySheet.current?.present()}
          />
        ) : null}
      </ListGroup>
      {profile.biometricLock ? (
        <Note>How long MeLedger can stay in the background before it asks again.</Note>
      ) : null}

      <ListGroup title="Privacy on screen">
        <ListRow
          title="Hide balances"
          subtitle="Dots on Home until you tap them"
          icon="eye-slash"
          iconColor="slate"
          trailing={
            <Switch
              value={profile.hideBalances}
              onValueChange={(on) => void updateProfile({ hideBalances: on })}
              accessibilityLabel="Hide balances"
            />
          }
        />
      </ListGroup>

      <ChoiceSheet
        ref={delaySheet}
        title="Lock"
        choices={DELAY_CHOICES}
        value={profile.lockDelay}
        onSelect={(lockDelay) => {
          void updateProfile({ lockDelay });
          delaySheet.current?.dismiss();
        }}
      />
    </SettingsPage>
  );
}
