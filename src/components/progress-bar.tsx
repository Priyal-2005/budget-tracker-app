import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ProgressBar({ progress }: { progress: number }) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(1, progress));
  const isComplete = clamped >= 1;

  return (
    <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clamped * 100}%`,
            backgroundColor: isComplete ? theme.success : theme.primary,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: Spacing.two,
    borderRadius: Spacing.one,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Spacing.one,
  },
});
