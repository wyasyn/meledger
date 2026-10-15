import { inArray } from 'drizzle-orm';
import * as Notifications from 'expo-notifications';

import { db } from '@/db/client';
import { alertLog } from '@/db/schema';

import { type Alert, outsideQuietHours } from './logic';

const DAILY_CHANNEL = 'daily-reminder';
const ALERTS_CHANNEL = 'alerts';
/** Marks that the alert log holds the state at the time alerts were first switched on. */
const BASELINE_KEY = 'baseline';

/** Alerts that arrive while the app is open still show as a banner. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Whether notifications are allowed, without prompting. */
export async function hasNotificationPermission(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

/** Only called from onboarding (project rule: no permission prompts anywhere else). */
export async function requestNotificationPermission(): Promise<boolean> {
  return (await Notifications.requestPermissionsAsync()).granted;
}

let channelsReady = false;
async function ensureChannels(): Promise<void> {
  if (channelsReady) return;
  await Notifications.setNotificationChannelAsync(DAILY_CHANNEL, {
    name: 'Daily reminder',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  await Notifications.setNotificationChannelAsync(ALERTS_CHANNEL, {
    name: 'Bills, budgets and goals',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  channelsReady = true;
}

const isOneOff = (identifier: string) =>
  identifier.startsWith('budget:') || identifier.startsWith('goal:');

export interface ScheduledReminder {
  identifier: string;
  date: Date;
  title: string;
  body: string;
  channel: 'daily' | 'alerts';
}

export interface NotificationPlan {
  /** Every future reminder (daily and bills); everything else scheduled is cancelled. */
  scheduled: ScheduledReminder[];
  /** One-off alerts that apply now; each is sent once, ever. */
  alerts: Alert[];
  quietStart: string;
  quietEnd: string;
}

/**
 * Brings the phone's notifications in line with the plan. Future reminders are replaced
 * wholesale. One-off alerts are sent once per key; the first run only records what already
 * applies, so switching alerts on never floods the user with old news.
 */
export async function applyNotificationPlan(plan: NotificationPlan, now: Date): Promise<void> {
  if (!(await hasNotificationPermission())) return;
  await ensureChannels();

  // Replace the reminders, but keep one-off alerts that wait for quiet hours to end.
  for (const n of await Notifications.getAllScheduledNotificationsAsync()) {
    if (!isOneOff(n.identifier)) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
  for (const r of plan.scheduled) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.identifier,
      content: { title: r.title, body: r.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: r.date,
        channelId: r.channel === 'daily' ? DAILY_CHANNEL : ALERTS_CHANNEL,
      },
    });
  }

  const keys = [BASELINE_KEY, ...plan.alerts.map((a) => a.key)];
  const sent = new Set(
    (await db.select().from(alertLog).where(inArray(alertLog.key, keys))).map((r) => r.key),
  );
  const fresh = plan.alerts.filter((a) => !sent.has(a.key));
  if (fresh.length === 0 && sent.has(BASELINE_KEY)) return;

  if (sent.has(BASELINE_KEY)) {
    for (const alert of fresh) {
      const when = outsideQuietHours(now, plan.quietStart, plan.quietEnd);
      await Notifications.scheduleNotificationAsync({
        identifier: alert.key,
        content: { title: alert.title, body: alert.body },
        trigger:
          when > now
            ? {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: when,
                channelId: ALERTS_CHANNEL,
              }
            : { channelId: ALERTS_CHANNEL },
      });
    }
  }
  const rows = [...fresh.map((a) => a.key), ...(sent.has(BASELINE_KEY) ? [] : [BASELINE_KEY])];
  if (rows.length > 0) {
    await db
      .insert(alertLog)
      .values(rows.map((key) => ({ key, sentAt: now })))
      .onConflictDoNothing();
  }
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
