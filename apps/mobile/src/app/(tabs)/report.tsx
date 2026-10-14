import { Text } from 'react-native-paper';

import { Screen } from '@/components/ui/Screen';
import { lightColors } from '@/theme/tokens';

export default function ReportScreen() {
  return (
    <Screen title="Report">
      <Text variant="bodyMedium" style={{ color: lightColors.onSurfaceVariant }}>
        Coming in milestone 4.
      </Text>
    </Screen>
  );
}
