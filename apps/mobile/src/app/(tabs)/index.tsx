import { Text } from 'react-native-paper';

import { Card } from '@/components/ui/Card';
import { MoneyText } from '@/components/ui/MoneyText';
import { Screen } from '@/components/ui/Screen';
import { lightColors } from '@/theme/tokens';

export default function HomeScreen() {
  return (
    <Screen title="Home">
      <Card>
        <Text variant="labelMedium" style={{ color: lightColors.onSurfaceVariant }}>
          Current Balance
        </Text>
        <MoneyText minor={0} />
      </Card>
      <Text variant="bodyMedium" style={{ color: lightColors.onSurfaceVariant }}>
        Balance header, wallets and transactions arrive in milestone 2.
      </Text>
    </Screen>
  );
}
