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
ThemedApp.displayName = 'ThemedApp';

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
RootNavigator.displayName = 'RootNavigator';
