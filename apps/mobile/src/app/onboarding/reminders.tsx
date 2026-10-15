import * as LocalAuthentication from 'expo-local-authentication';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Chip, ChipGroup } from '@/components/ui/Chip';
import { ListGroup, ListRow } from '@/components/ui/ListGroup';
import { Switch } from '@/components/ui/Switch';
import { Text } from '@/components/ui/Text';
import { showSnackbar } from '@/features/feedback/snackbar';
import { finishOnboarding } from '@/features/onboarding/finish';
import { OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { useOnboarding } from '@/features/onboarding/store';
import { showPermissionSheet } from '@/features/permissions/store';
import { requestNotificationPermission } from '@/features/reminders/notifications';
import { lightColors, radius, shadow, spacing } from '@/theme/tokens';

const TIMES = ['07:00', '12:00', '18:00', '20:00', '21:00'];

/** Last step. Notification permission is requested here (onboarding only). */
export default function RemindersStep() {
  const { reminderOn, reminderTime, biometricLock, set } = useOnboarding();
  const [saving, setSaving] = useState(false);

  const toggleReminder = async (on: boolean) => {
    if (!on) return set({ reminderOn: false });
    const granted = await requestNotificationPermission();
    set({ reminderOn: granted });
    if (!granted) showSnackbar({ message: 'Reminders stay off. You can allow them in Settings.' });
  };

  const toggleBiometric = async (on: boolean) => {
    if (!on) return set({ biometricLock: false });
    const ready =
      (await LocalAuthentication.hasHardwareAsync()) &&
      (await LocalAuthentication.isEnrolledAsync());
    if (ready) set({ biometricLock: true });
    else showPermissionSheet('biometrics');
  };

  const finish = async () => {
    setSaving(true);
    try {
      // The reminder starts switched on, so the permission may not have been asked yet. Once
      // onboarding is saved, NotificationSync schedules it.
      if (useOnboarding.getState().reminderOn && !(await requestNotificationPermission())) {
        set({ reminderOn: false });
      }
      // Saving flips the onboarding guard; the root stack then restarts on Home.
      await finishOnboarding();
    } catch (error) {
      console.error('finishOnboarding', error);
      showSnackbar({ message: "Couldn't save your setup. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingStep
      step="reminders"
      icon="bell"
      title="Stay on track"
      body="A gentle nudge once a day helps you remember everything. You can change this anytime."
      primary={{ label: 'Finish', onPress: finish, loading: saving }}
    >
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Text variant="subtitle">Daily reminder</Text>
            <Text variant="caption" tone="muted">
              {reminderOn ? `Every day at ${reminderTime}` : 'Off'}
            </Text>
          </View>
          <Switch
            value={reminderOn}
            onValueChange={toggleReminder}
            accessibilityLabel="Daily reminder"
          />
        </View>
        {reminderOn ? (
          <ChipGroup>
            {TIMES.map((time) => (
              <Chip
                key={time}
                label={time}
                tone="muted"
                selected={time === reminderTime}
                onPress={() => set({ reminderTime: time })}
                accessibilityLabel={`Remind me at ${time}`}
              />
            ))}
          </ChipGroup>
        ) : null}
      </View>
      <ListGroup>
        <ListRow
          title="Lock with fingerprint"
          subtitle="Ask for your fingerprint or face to open MeLedger"
          icon="fingerprint"
          iconColor="blue"
          trailing={
            <Switch
              value={biometricLock}
              onValueChange={toggleBiometric}
              accessibilityLabel="Lock with fingerprint"
            />
          }
        />
      </ListGroup>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: lightColors.surface,
    boxShadow: shadow.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: 2 },
});
