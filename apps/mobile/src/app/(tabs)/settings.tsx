import { router } from 'expo-router';

import { ListGroup, ListRow } from '@/components/ui/ListGroup';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';

export default function SettingsScreen() {
  return (
    <Screen title="Settings">
      <ListGroup title="Preferences">
        <ListRow
          title="Wallets"
          subtitle="Cash, mobile money, bank and cards"
          icon="wallet"
          iconColor="blue"
          onPress={() => router.push('/wallets')}
        />
      </ListGroup>
      <Text variant="caption" tone="muted" align="center">
        The full settings screen arrives in milestone 5.
      </Text>
    </Screen>
  );
}
