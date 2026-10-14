import { Text } from 'react-native-paper';

import { Screen } from '@/components/ui/Screen';
import { lightColors } from '@/theme/tokens';

export default function SettingsScreen() {
  return (
    <Screen title="Settings">
      <Text variant="bodyMedium" style={{ color: lightColors.onSurfaceVariant }}>
        Coming in milestone 5.
      </Text>
    </Screen>
  );
}
