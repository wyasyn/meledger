import { StyleSheet, View } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';

import { lightColors } from '@/theme/tokens';

export function LoadingScreen() {
  return (
    <View style={styles.root}>
      <ActivityIndicator />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: lightColors.background,
  },
});
