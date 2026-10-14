import { Tabs } from 'expo-router';

import { TabBar } from '@/components/navigation/TabBar';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="report" options={{ title: 'Report' }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
