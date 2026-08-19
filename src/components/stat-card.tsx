import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, type ThemeColor } from '@/constants/theme';

interface StatCardProps {
  label: string;
  value: string;
  valueColor?: ThemeColor;
  caption?: string;
}

export function StatCard({ label, value, valueColor, caption }: StatCardProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText themeColor="textSecondary" type="small">
        {label}
      </ThemedText>
      <ThemedText type="subtitle" themeColor={valueColor} style={styles.value}>
        {value}
      </ThemedText>
      {caption && (
        <ThemedText themeColor="textSecondary" type="small">
          {caption}
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
    flex: 1,
  },
  value: {
    fontSize: 24,
    lineHeight: 30,
  },
});
