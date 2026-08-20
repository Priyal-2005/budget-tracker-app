import { Link, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatCard } from '@/components/stat-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useMonthlySummary } from '@/hooks/use-monthly-summary';
import { useProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import { formatINR } from '@/lib/currency';

export default function HomeScreen() {
  const { summary, isLoading, error, refresh } = useMonthlySummary();
  const profile = useProfile();
  const theme = useTheme();

  const monthLabel = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // Tab screens stay mounted, so without this the totals keep showing whatever
  // was true when the tab first opened — stale as soon as anything is logged.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.container}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} />}>
          <ThemedView style={styles.header}>
            <ThemedView style={styles.headerText}>
              <ThemedText type="title" style={styles.title}>
                {profile?.display_name ? `Hi, ${profile.display_name}` : 'Home'}
              </ThemedText>
              <ThemedText themeColor="textSecondary">{monthLabel}</ThemedText>
            </ThemedView>
            <Link href="/(app)/settings" asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Settings"
                style={StyleSheet.flatten([
                  styles.settingsButton,
                  { backgroundColor: theme.backgroundElement },
                ])}>
                <ThemedText type="smallBold">Settings</ThemedText>
              </Pressable>
            </Link>
          </ThemedView>

          {error && (
            <ThemedText themeColor="danger" type="small">
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
                  valueColor={summary.bufferRemaining < 0 ? 'danger' : 'primary'}
                  caption={`of ${formatINR(summary.bufferAllotted)} allotted`}
                />
                <StatCard
                  label="Savings so far"
                  value={formatINR(summary.savings)}
                  valueColor={summary.savings < 0 ? 'danger' : 'success'}
                />
              </View>
            </>
          )}

          {!isLoading && !summary && !error && (
            <ThemedText themeColor="textSecondary">
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
  settingsButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  title: { fontSize: 28, lineHeight: 34 },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
});
