import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { ListGroup, ListRow } from '@/components/ui/ListGroup';
import type { SheetRef } from '@/components/ui/Sheet';
import { Switch } from '@/components/ui/Switch';
import { showPermissionSheet } from '@/features/permissions/store';
import { updateProfile, useProfile } from '@/features/profile/repo';
import { hasNotificationPermission } from '@/features/reminders/notifications';
import { type Choice, ChoiceSheet, Note, SettingsPage } from '@/features/settings/components';

const hours = (list: number[]): Choice<string>[] =>
  list.map((h) => {
    const value = `${String(h % 24).padStart(2, '0')}:00`;
    return { value, label: value };
  });

const REMINDER_TIMES = hours([7, 8, 12, 17, 18, 19, 20, 21, 22]);
const QUIET_STARTS = hours([20, 21, 22, 23, 24]);
const QUIET_ENDS = hours([5, 6, 7, 8, 9]);

type Picking = 'reminder' | 'quietStart' | 'quietEnd';

/** Whether Android lets MeLedger notify, checked again whenever the user comes back. */
function useNotificationsAllowed(): boolean | undefined {
  const [allowed, setAllowed] = useState<boolean>();
  useEffect(() => {
    const check = () => void hasNotificationPermission().then(setAllowed);
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, []);
  return allowed;
}

export default function NotificationsSettings() {
  const profile = useProfile();
  const allowed = useNotificationsAllowed();
  const [picking, setPicking] = useState<Picking>('reminder');
  const sheet = useRef<SheetRef>(null);
  if (!profile) return <SettingsPage title="Reminders & alerts">{null}</SettingsPage>;

  // Turning something on without permission explains how to allow it (no system prompt here).
  const toggle =
    (key: 'reminderOn' | 'billAlerts' | 'budgetAlerts' | 'goalAlerts') => (on: boolean) => {
      if (on && allowed === false) {
        showPermissionSheet('notifications');
        return;
      }
      void updateProfile({ [key]: on });
    };

  const pick = (what: Picking) => {
    setPicking(what);
    sheet.current?.present();
  };

  const sheetProps = {
    reminder: { title: 'Reminder time', choices: REMINDER_TIMES, value: profile.reminderTime },
    quietStart: { title: 'Quiet from', choices: QUIET_STARTS, value: profile.quietStart },
    quietEnd: { title: 'Quiet until', choices: QUIET_ENDS, value: profile.quietEnd },
  }[picking];

  const switchFor = (
    key: 'reminderOn' | 'billAlerts' | 'budgetAlerts' | 'goalAlerts',
    label: string,
  ) => (
    <Switch
      value={profile[key] && allowed !== false}
      onValueChange={toggle(key)}
      accessibilityLabel={label}
    />
  );

  return (
    <SettingsPage title="Reminders & alerts">
      {allowed === false ? (
        <ListGroup>
          <ListRow
            title="Notifications are off"
            subtitle="Allow them for MeLedger in Android settings"
            icon="bell"
            iconColor="orange"
            onPress={() => showPermissionSheet('notifications')}
          />
        </ListGroup>
      ) : null}

      <ListGroup title="Daily reminder">
        <ListRow
          title="Remind me to log"
          subtitle="Skipped on days you've logged"
          icon="bell"
          iconColor="green"
          trailing={switchFor('reminderOn', 'Daily reminder')}
        />
        {profile.reminderOn && allowed !== false ? (
          <ListRow
            title="Time"
            icon="clock"
            iconColor="teal"
            value={profile.reminderTime}
            onPress={() => pick('reminder')}
          />
        ) : null}
      </ListGroup>

      <ListGroup title="Alerts">
        <ListRow
          title="Bills due"
          subtitle="The morning before a bill is due"
          icon="repeat"
          iconColor="blue"
          trailing={switchFor('billAlerts', 'Bill alerts')}
        />
        <ListRow
          title="Budgets"
          subtitle="At your warning level and 100%"
          icon="chart-donut"
          iconColor="orange"
          trailing={switchFor('budgetAlerts', 'Budget alerts')}
        />
        <ListRow
          title="Goals"
          subtitle="At 25, 50, 75 and 100%"
          icon="target"
          iconColor="lime"
          trailing={switchFor('goalAlerts', 'Goal alerts')}
        />
      </ListGroup>

      <ListGroup title="Quiet hours">
        <ListRow
          title="From"
          icon="moon"
          iconColor="slate"
          value={profile.quietStart}
          onPress={() => pick('quietStart')}
        />
        <ListRow
          title="Until"
          icon="clock"
          iconColor="slate"
          value={profile.quietEnd}
          onPress={() => pick('quietEnd')}
        />
      </ListGroup>
      <Note>
        Alerts that would arrive during quiet hours wait until they end. The daily reminder keeps
        its time.
      </Note>

      <ChoiceSheet
        ref={sheet}
        {...sheetProps}
        onSelect={(value) => {
          const key = { reminder: 'reminderTime', quietStart: 'quietStart', quietEnd: 'quietEnd' }[
            picking
          ];
          void updateProfile({ [key]: value });
          sheet.current?.dismiss();
        }}
      />
    </SettingsPage>
  );
}
