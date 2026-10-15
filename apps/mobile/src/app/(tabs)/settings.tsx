import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ListGroup, ListRow } from '@/components/ui/ListGroup';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Sheet, type SheetRef } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { shareEntriesCsv } from '@/features/export/share';
import { showSnackbar } from '@/features/feedback/snackbar';
import { useProfile } from '@/features/profile/repo';
import { ProBadge } from '@/features/settings/components';
import { deleteAllLocalData } from '@/features/settings/repo';
import { useLedgerData } from '@/features/transactions/useLedgerData';
import { lightColors, radius, spacing } from '@/theme/tokens';

/** Pro features are shown now and arrive with accounts in a later update (milestone 6). */
const comingWithPro = (what: string) =>
  showSnackbar({ message: `${what} comes with MeLedger Pro, coming soon.` });

export default function SettingsScreen() {
  const profile = useProfile();
  const data = useLedgerData();
  const [exporting, setExporting] = useState(false);
  const deleteSheet = useRef<SheetRef>(null);

  const exportCsv = async () => {
    if (!data || exporting) return;
    if (data.transactions.length === 0) {
      showSnackbar({ message: 'Nothing to export yet. Add an entry first.' });
      return;
    }
    setExporting(true);
    try {
      if (!(await shareEntriesCsv(data, new Date()))) {
        showSnackbar({ message: "This phone can't share files." });
      }
    } catch (e) {
      console.error('export', e);
      showSnackbar({ message: "Couldn't create the file. Please try again." });
    } finally {
      setExporting(false);
    }
  };

  const locked = (title: string, icon: string, iconColor: string, subtitle?: string) => (
    <ListRow
      title={title}
      subtitle={subtitle}
      icon={icon}
      iconColor={iconColor}
      trailing={<ProBadge />}
      onPress={() => comingWithPro(title)}
    />
  );

  return (
    <Screen title="Settings">
      <PressableScale
        onPress={() => comingWithPro('Everything here')}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel="MeLedger Pro. Smart voice, advice and backups. Coming soon."
        style={styles.banner}
      >
        <View style={styles.bannerTile}>
          <Icon name="sparkle" weight="fill" size={26} color="#FFFFFF" />
        </View>
        <View style={styles.flex}>
          <View style={styles.bannerTitle}>
            <Text variant="subtitle" style={styles.onBlue}>
              MeLedger
            </Text>
            <View style={styles.proPill}>
              <Text variant="micro" style={styles.onBlue}>
                Pro
              </Text>
            </View>
          </View>
          <Text variant="caption" style={styles.onBlueSoft}>
            Smart voice, a money advisor and backups. Coming soon.
          </Text>
        </View>
        <Icon name="chevron-right" size={18} color="#FFFFFF" />
      </PressableScale>

      <ListGroup title="Preferences">
        <ListRow
          title="General currency"
          icon="currency"
          iconColor="amber"
          trailing={
            <View style={styles.currencyPill}>
              <Text variant="label" style={styles.currencyText}>
                UGX
              </Text>
            </View>
          }
        />
        <ListRow
          title="Categories"
          icon="category"
          iconColor="orange"
          onPress={() => router.push('/settings/categories')}
        />
        <ListRow
          title="Wallets"
          subtitle="Cash, mobile money, bank and cards"
          icon="wallet"
          iconColor="blue"
          onPress={() => router.push('/wallets')}
        />
        <ListRow
          title="Reminders & alerts"
          subtitle={
            profile?.reminderOn ? `Daily reminder at ${profile.reminderTime}` : 'Daily reminder off'
          }
          icon="bell"
          iconColor="green"
          onPress={() => router.push('/settings/notifications')}
        />
        <ListRow
          title="Voice & input"
          subtitle="Words MeLedger has learned"
          icon="mic"
          iconColor="teal"
          onPress={() => router.push('/settings/voice')}
        />
        <ListRow
          title="Language"
          icon="language"
          iconColor="pink"
          value="English"
          onPress={() => comingWithPro('Luganda')}
        />
      </ListGroup>

      <ListGroup title="AI & advisor">
        {locked('AI parsing', 'robot', 'blue', 'Understands longer, mixed sentences')}
        {locked('Advisor tone', 'chat', 'teal', 'Gentle or direct')}
        {locked('Weekly digest', 'calendar-check', 'green')}
        {locked('Spoken replies', 'speaker', 'orange')}
      </ListGroup>

      <ListGroup title="Tools & data">
        <ListRow
          title="Appearance"
          subtitle="Light"
          icon="palette"
          iconColor="pink"
          onPress={() => router.push('/settings/appearance')}
        />
        {locked('Backups & sync', 'cloud', 'blue')}
        <ListRow
          title="Export data"
          subtitle={exporting ? 'Preparing your file…' : 'All entries as a CSV file'}
          icon="download"
          iconColor="lime"
          onPress={exportCsv}
        />
        <ListRow
          title="Security"
          subtitle={profile?.biometricLock ? 'App lock on' : 'App lock off'}
          icon="fingerprint"
          iconColor="blue"
          onPress={() => router.push('/settings/security')}
        />
        <ListRow
          title="Advanced"
          icon="sliders"
          iconColor="slate"
          onPress={() => router.push('/settings/advanced')}
        />
      </ListGroup>

      <ListGroup title="Account">
        {locked('Sign in', 'sign-in', 'blue', 'Back up and use MeLedger on other phones')}
        {locked('Subscription', 'crown', 'amber')}
        <ListRow
          title="Delete all local data"
          subtitle="Erase everything on this phone"
          icon="trash"
          iconColor={lightColors.expense}
          onPress={() => deleteSheet.current?.present()}
        />
        {locked('Delete account', 'user-minus', 'slate')}
      </ListGroup>

      <ListGroup title="About">
        <ListRow
          title="Help"
          icon="help"
          iconColor="teal"
          onPress={() => router.push('/settings/help')}
        />
        <ListRow
          title="Privacy policy"
          icon="privacy"
          iconColor="green"
          onPress={() => router.push('/settings/privacy')}
        />
        <ListRow
          title="Version"
          icon="info"
          iconColor="slate"
          value={Constants.expoConfig?.version ?? ''}
        />
      </ListGroup>

      <DeleteAllSheet sheetRef={deleteSheet} />
    </Screen>
  );
}

function DeleteAllSheet({ sheetRef }: { sheetRef: React.RefObject<SheetRef | null> }) {
  const [deleting, setDeleting] = useState(false);
  const confirm = async () => {
    setDeleting(true);
    try {
      sheetRef.current?.dismiss();
      // Clearing the profile restarts the app in onboarding.
      await deleteAllLocalData();
    } catch (e) {
      console.error('deleteAllLocalData', e);
      showSnackbar({ message: "Couldn't delete everything. Please try again." });
      setDeleting(false);
    }
  };
  return (
    <Sheet ref={sheetRef} title="Delete all local data?">
      <View style={styles.sheetBody}>
        <Text variant="body" tone="muted">
          Every entry, wallet, budget, goal, bill, debt and savings group on this phone is erased
          for good. MeLedger starts again from the beginning. This can&apos;t be undone.
        </Text>
        <Button
          label="Delete everything"
          variant="danger"
          icon="trash"
          onPress={confirm}
          loading={deleting}
          block
        />
        <Button
          label="Keep my data"
          variant="ghost"
          onPress={() => sheetRef.current?.dismiss()}
          block
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: lightColors.primary,
  },
  bannerTile: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  bannerTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  proPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  onBlue: { color: '#FFFFFF' },
  onBlueSoft: { color: 'rgba(255,255,255,0.85)' },
  currencyPill: {
    paddingHorizontal: spacing.md,
    height: 30,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: lightColors.outline,
  },
  currencyText: { color: lightColors.onSurface },
  sheetBody: { paddingHorizontal: spacing.gutter, gap: spacing.md },
});
