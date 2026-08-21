/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Surfaces are kept close together in tone and separated by a hairline border
// rather than strong fills — pure black against mid grey reads as harsh boxes,
// which is what the earlier palette did on a phone at night.
export const Colors = {
  light: {
    text: '#16181D',
    background: '#FFFFFF',
    backgroundElement: '#F7F8FA',
    backgroundSelected: '#EDEFF3',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    border: '#E8EAEE',
    primary: '#2563EB',
    primarySoft: '#EFF4FE',
    success: '#12805C',
    warning: '#B45309',
    danger: '#DC2626',
  },
  dark: {
    text: '#F5F6F7',
    // Not pure black: a near-black lets cards sit slightly above the page
    // without the jarring contrast step.
    background: '#0B0C0E',
    backgroundElement: '#16181C',
    backgroundSelected: '#212429',
    textSecondary: '#9BA1AA',
    textMuted: '#6B717A',
    border: '#24272C',
    primary: '#5B9BF8',
    primarySoft: '#161D2B',
    success: '#3DD68C',
    warning: '#E0A03C',
    danger: '#F87171',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/** Corner rounding, kept consistent so surfaces feel like one family. */
export const Radius = {
  small: 10,
  medium: 14,
  large: 18,
  pill: 999,
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
