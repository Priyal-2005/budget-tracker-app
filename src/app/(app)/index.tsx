import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { StatCard } from '@/components/stat-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TrendChart } from '@/components/trend-chart';
import { Radius, Spacing } from '@/constants/theme';
import { useThemePreference } from '@/contexts/theme-context';
import { useMonthlyReport } from '@/hooks/use-monthly-report';
import { useMonthlySummary } from '@/hooks/use-monthly-summary';
import { TREND_MONTHS, useMonthlyTrend, type MonthTotals } from '@/hooks/use-monthly-trend';
import { useProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import { bufferStatusColor, bufferStatusLabel, getBufferStatus } from '@/lib/buffer-status';
import { formatINR } from '@/lib/currency';
import { buildReportHtml } from '@/lib/report-html';
import { shareReportHtml } from '@/lib/share-report';

// Comparing against last month only makes sense once that month has something
// in it — a first-ever month has nothing to be up or down against.
function describeSpendChange(trend: MonthTotals[]) {
  if (trend.length < 2) return null;
  const thisMonth = trend[trend.length - 1];
  const lastMonth = trend[trend.length - 2];
  if (lastMonth.spend === 0) return null;

  // This month is still running, so it is stated against last month's full
  // total rather than dressed up as a trend — early in a month "less spent
  // than last month" would be true but meaningless.
  return `${formatINR(thisMonth.spend)} spent so far, against ${formatINR(
    lastMonth.spend
  )} for all of last month.`;
}

export default function HomeScreen() {
  const { summary, isLoading, error, refresh } = useMonthlySummary();
  const profile = useProfile();
  const theme = useTheme();
  const { build } = useMonthlyReport();
  const { trend, refresh: refreshTrend } = useMonthlyTrend();
  const { scheme, toggle } = useThemePreference();
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    setIsSharing(true);
    const { report, error: reportError } = await build();
    if (reportError || !report) {
      setIsSharing(false);
      Alert.alert('Could not build summary', reportError ?? 'Please try again.');
      return;
    }
    const { error: shareError } = await shareReportHtml(
      buildReportHtml(report, profile?.display_name ?? null)
    );
    setIsSharing(false);
    if (shareError) Alert.alert('Could not share summary', shareError);
  };

  const monthLabel = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const bufferStatus = getBufferStatus(summary?.bufferRemaining ?? 0, summary?.bufferAllotted ?? 0);
  const comparison = describeSpendChange(trend);

  // Tab screens stay mounted, so without this the totals keep showing whatever
  // was true when the tab first opened — stale as soon as anything is logged.
  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshTrend();
    }, [refresh, refreshTrend])
  );

  return (
    <ThemedView type="background" style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} />}>
          <ThemedView style={styles.header}>
            <ThemedView style={styles.headerText}>
              <ThemedText type="screenTitle">
                {profile?.display_name ? `Hi, ${profile.display_name}` : 'Home'}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {monthLabel}
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.headerActions}>
              <Pressable
                onPress={toggle}
                accessibilityRole="button"
                accessibilityLabel={scheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                style={[styles.iconButton, { backgroundColor: theme.backgroundElement }]}>
                <Ionicons
                  name={scheme === 'dark' ? 'sunny' : 'moon'}
                  size={18}
                  color={theme.text}
                />
              </Pressable>
              <Link href="/(app)/settings" asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Settings"
                  style={StyleSheet.flatten([
                    styles.settingsButton,
                    { backgroundColor: theme.backgroundElement },
                  ])}>
                  <ThemedText style={styles.settingsLabel}>Settings</ThemedText>
                </Pressable>
              </Link>
            </ThemedView>
          </ThemedView>

          {error && (
            <ThemedText themeColor="danger" type="caption">
              {error}
            </ThemedText>
          )}

          {summary && (
            <>
              <View style={styles.row}>
                <StatCard label="Income this month" value={formatINR(summary.totalIncome)} />
                <StatCard label="Fixed expenses" value={formatINR(summary.totalFixed)} />
              </View>

              <View style={styles.row}>
                <StatCard
                  label="Buffer remaining"
                  value={formatINR(summary.bufferRemaining)}
                  valueColor={bufferStatusColor(bufferStatus)}
                  caption={
                    bufferStatusLabel(bufferStatus) ??
                    `of ${formatINR(summary.bufferAllotted)} allotted`
                  }
                />
                <StatCard
                  label="Savings so far"
                  value={formatINR(summary.savings)}
                  valueColor={summary.savings < 0 ? 'danger' : 'success'}
                />
              </View>

              <Card style={styles.trendSection}>
                <ThemedText type="sectionLabel" themeColor="textMuted">
                  Last {TREND_MONTHS} months
                </ThemedText>
                <TrendChart trend={trend} />
                {comparison && (
                  <ThemedText type="caption" themeColor="textSecondary" style={styles.comparison}>
                    {comparison}
                  </ThemedText>
                )}
              </Card>

              <ThemedView style={styles.shareSection}>
                <Button
                  title="Share this month's summary"
                  variant="secondary"
                  onPress={handleShare}
                  isLoading={isSharing}
                />
                <ThemedText type="caption" themeColor="textSecondary" style={styles.shareHint}>
                  Makes a one-page PDF of this month — handy for showing your parents.
                </ThemedText>
              </ThemedView>
            </>
          )}

          {!isLoading && !summary && !error && (
            <ThemedText type="caption" themeColor="textSecondary">
              No data yet for {monthLabel}. Log some income and expenses to see your summary.
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  headerText: { gap: Spacing.half, flex: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButton: {
    paddingHorizontal: Spacing.three,
    height: 40,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsLabel: { fontSize: 15, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  trendSection: {
    marginTop: Spacing.two,
    gap: Spacing.three,
  },
  comparison: { textAlign: 'center' },
  shareSection: {
    marginTop: Spacing.two,
    gap: Spacing.two,
  },
  shareHint: { textAlign: 'center' },
});
