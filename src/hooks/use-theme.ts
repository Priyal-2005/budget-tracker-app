/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useThemePreference } from '@/contexts/theme-context';

export function useTheme() {
  // Follows the user's own choice, falling back to the system setting when
  // they have not picked one.
  const { scheme } = useThemePreference();

  return Colors[scheme];
}
