import { Article, SettingsPage } from '@/features/settings/components';

const SECTIONS = [
  {
    title: 'Your data stays on your phone',
    body: 'MeLedger works without an account. Your entries, wallets, budgets and goals are stored only on this phone and are not sent to any server.',
  },
  {
    title: 'Your voice',
    body: "When you talk, your phone's speech service (Google on most Android phones) turns your voice into text. MeLedger never records or keeps audio.",
  },
  {
    title: 'What you said',
    body: 'The text of each voice entry is saved with it, so MeLedger can learn your words. You can turn this off in Settings, Advanced, which also deletes the text already saved.',
  },
  {
    title: 'Keeping it private',
    body: 'Lock MeLedger with your fingerprint, face or PIN, and hide balances on Home, in Settings, Security.',
  },
  {
    title: 'Reminders',
    body: 'Reminders and alerts are created on your phone. Nothing is sent from a server.',
  },
  {
    title: 'Exports',
    body: 'An export is a file you share yourself. MeLedger only creates it; you choose where it goes.',
  },
  {
    title: 'Deleting your data',
    body: 'Settings, Delete all local data erases everything MeLedger stored on this phone.',
  },
  {
    title: 'MeLedger Pro',
    body: 'Pro features such as backups and the advisor will need an account. This page will explain what they send before they arrive.',
  },
];

export default function PrivacyScreen() {
  return (
    <SettingsPage title="Privacy policy">
      <Article sections={SECTIONS} />
    </SettingsPage>
  );
}
