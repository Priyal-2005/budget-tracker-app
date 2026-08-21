import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

import { useTheme } from '@/hooks/use-theme';

// Filled when active, outline when not — the usual iOS/Android tab convention.
function tabIcon(active: IoniconName, inactive: IoniconName) {
  const Icon = ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color as string} />
  );
  Icon.displayName = 'TabIcon';
  return Icon;
}

export default function AppTabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="income"
        options={{ title: 'Income', tabBarIcon: tabIcon('wallet', 'wallet-outline') }}
      />
      <Tabs.Screen
        name="items"
        options={{ title: 'Items', tabBarIcon: tabIcon('repeat', 'repeat-outline') }}
      />
      <Tabs.Screen
        name="log"
        options={{ title: 'Log', tabBarIcon: tabIcon('add-circle', 'add-circle-outline') }}
      />
      <Tabs.Screen
        name="goals"
        options={{ title: 'Goals', tabBarIcon: tabIcon('flag', 'flag-outline') }}
      />
      {/* Reached from the Home header rather than the tab bar, to keep the bar
          to the five screens used day to day. */}
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
