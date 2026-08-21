import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ title, onPress, variant = 'primary', isLoading, disabled, style }: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || isLoading;

  const backgroundColor =
    variant === 'primary'
      ? theme.primary
      : variant === 'danger'
        ? theme.danger
        : theme.backgroundSelected;
  const textColor = variant === 'secondary' ? theme.text : '#ffffff';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      // A slight shrink on press reads as a physical button rather than a
      // rectangle that merely dims.
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          opacity: isDisabled ? 0.5 : pressed ? 0.9 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.985 : 1 }],
        },
        style,
      ]}>
      {isLoading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <ThemedText style={[styles.label, { color: textColor }]}>{title}</ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Radius.small,
    paddingVertical: Spacing.three - 2,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});
