import { View, type ViewProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
};

export function ThemedView({ style, lightColor, darkColor, type, ...otherProps }: ThemedViewProps) {
  const theme = useTheme();

  // Only paints when a surface is actually asked for. Painting by default made
  // every nested layout wrapper stamp the page colour over the card behind it —
  // barely visible on white, but obvious dark boxes in dark mode.
  return <View style={[type ? { backgroundColor: theme[type] } : null, style]} {...otherProps} />;
}
