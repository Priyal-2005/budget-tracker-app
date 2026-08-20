import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, useColorScheme as useSystemColorScheme } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';

// SecureStore rather than a separate storage library: it already ships in the
// app, so remembering the theme needs no new native module and reaches people
// as an over-the-air update.
const STORAGE_KEY = 'theme-preference';

const storage = {
  get: async () =>
    Platform.OS === 'web'
      ? (globalThis.localStorage?.getItem(STORAGE_KEY) ?? null)
      : SecureStore.getItemAsync(STORAGE_KEY),
  set: async (value: string) =>
    Platform.OS === 'web'
      ? globalThis.localStorage?.setItem(STORAGE_KEY, value)
      : SecureStore.setItemAsync(STORAGE_KEY, value),
};

interface ThemeContextValue {
  /** What the user picked, which may be 'system'. */
  preference: ThemePreference;
  /** The scheme actually in effect once 'system' is resolved. */
  scheme: 'light' | 'dark';
  setPreference: (preference: ThemePreference) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    storage.get().then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
      }
    });
  }, []);

  const scheme: 'light' | 'dark' =
    preference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<ThemeContextValue>(() => {
    const setPreference = (next: ThemePreference) => {
      setPreferenceState(next);
      storage.set(next).catch(() => {
        // A preference that fails to save is not worth interrupting anyone for;
        // it simply falls back to the system setting next launch.
      });
    };

    return {
      preference,
      scheme,
      setPreference,
      // Toggling picks the opposite of what is on screen, which turns an
      // implicit 'system' choice into an explicit one.
      toggle: () => setPreference(scheme === 'dark' ? 'light' : 'dark'),
    };
  }, [preference, scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreference() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemePreference must be used within a ThemeProvider');
  return ctx;
}
