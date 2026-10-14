import * as Notifications from 'expo-notifications';

const CHANNEL = 'daily-reminder';

/** Whether notifications are allowed, without prompting. */
export async function hasNotificationPermission(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

/** Only called from onboarding (project rule: no permission prompts anywhere else). */
export async function requestNotificationPermission(): Promise<boolean> {
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Replaces any scheduled reminder with one every day at `time` ("HH:mm"). */
export async function scheduleDailyReminder(time: string): Promise<void> {
  const [hour, minute] = time.split(':').map(Number);
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Daily reminder',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Anything to log today?',
      body: 'Say it in a few words and MeLedger keeps track.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      channelId: CHANNEL,
      hour,
      minute,
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
