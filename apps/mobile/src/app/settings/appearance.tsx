import { ListGroup, ListRow } from '@/components/ui/ListGroup';
import { Note, SettingsPage } from '@/features/settings/components';

export default function AppearanceSettings() {
  return (
    <SettingsPage title="Appearance">
      <ListGroup title="Theme">
        <ListRow title="Light" icon="sparkle" iconColor="amber" selected />
        <ListRow title="Dark" subtitle="Coming soon" icon="moon" iconColor="slate" />
        <ListRow title="Same as phone" subtitle="Coming soon" icon="settings" iconColor="slate" />
      </ListGroup>
      <Note>A dark theme is on its way in a later update.</Note>
    </SettingsPage>
  );
}
