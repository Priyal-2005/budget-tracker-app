import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { ThemeProvider, useThemePreference } from '@/contexts/theme-context';
import { useAutoUpdate } from '@/hooks/use-auto-update';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useAutoUpdate();

  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}

// Sits inside ThemeProvider so navigation chrome follows the chosen theme too,
// not just the screens.
function ThemedApp() {
  const { scheme } = useThemePreference();

  return (
    <NavigationThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </NavigationThemeProvider>
  );
}

function RootNavigator() {
  const { session, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}
