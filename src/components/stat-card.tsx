import { StyleSheet } from 'react-native';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, type ThemeColor } from '@/constants/theme';

interface StatCardProps {
  label: string;
  value: string;
  valueColor?: ThemeColor;
  caption?: string;
}

export function StatCard({ label, value, valueColor, caption }: StatCardProps) {
  return (
    <Card style={styles.card}>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="metric" themeColor={valueColor}>
        {value}
      </ThemedText>
      {caption && (
        <ThemedText type="caption" themeColor="textSecondary">
          {caption}
        </ThemedText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.half,
    flex: 1,
  },
});
