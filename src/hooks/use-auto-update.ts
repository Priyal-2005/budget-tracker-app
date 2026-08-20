import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { Platform } from 'react-native';

// Checks for a published update on launch and applies it straight away, so a
// new version never needs reinstalling. Without this, expo-updates downloads
// in the background and only swaps the new code in on the *next* launch, which
// means always running one version behind.
//
// This only covers JavaScript changes. Adding a native module still needs a
// fresh build and a real reinstall.
export function useAutoUpdate() {
  useEffect(() => {
    // In development the bundle comes from the Metro server, and there is no
    // update server behind the web build.
    if (__DEV__ || Platform.OS === 'web') return;

    let cancelled = false;

    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (cancelled || !check.isAvailable) return;

        await Updates.fetchUpdateAsync();
        if (cancelled) return;

        await Updates.reloadAsync();
      } catch {
        // Offline, or the update server is unreachable — carry on with the
        // version already installed rather than blocking the app.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);
}
