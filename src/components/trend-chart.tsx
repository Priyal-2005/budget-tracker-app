import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { MonthTotals } from '@/hooks/use-monthly-trend';
import { useTheme } from '@/hooks/use-theme';
import { formatINR } from '@/lib/currency';

const CHART_HEIGHT = 96;

export function TrendChart({ trend }: { trend: MonthTotals[] }) {
  const theme = useTheme();

  const peak = Math.max(...trend.map((month) => Math.max(month.income, month.spend)), 0);

  if (peak === 0) {
    return (
      <ThemedText themeColor="textSecondary" type="small">
        Nothing logged in the last few months yet — the comparison shows up once there is more than
        one month of history.
      </ThemedText>
    );
  }

  // A bar at exactly zero would vanish, so anything non-zero keeps a sliver.
  const heightFor = (value: number) => (value <= 0 ? 0 : Math.max(3, (value / peak) * 100));

  return (
    <ThemedView style={styles.container}>
      <View style={styles.chart}>
        {trend.map((month) => (
          <View
            key={month.monthKey}
            style={styles.column}
            accessibilityLabel={`${month.label}: earned ${formatINR(month.income)}, spent ${formatINR(
              month.spend
            )}`}>
            <View style={styles.bars}>
              <View
                style={[styles.bar, { height: `${heightFor(month.income)}%`, backgroundColor: theme.success }]}
              />
              <View
                style={[styles.bar, { height: `${heightFor(month.spend)}%`, backgroundColor: theme.primary }]}
              />
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {month.label}
            </ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: theme.success }]} />
          <ThemedText type="small" themeColor="textSecondary">
            In
          </ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.swatch, { backgroundColor: theme.primary }]} />
          <ThemedText type="small" themeColor="textSecondary">
            Out
          </ThemedText>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  column: { alignItems: 'center', gap: Spacing.one, flex: 1 },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    height: CHART_HEIGHT,
    gap: 3,
  },
  bar: { width: 11, borderRadius: 3 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.three },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  swatch: { width: 9, height: 9, borderRadius: 2 },
});
