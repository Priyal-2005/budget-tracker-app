import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useProfile } from '@/hooks/use-profile';

export default function SettingsScreen() {
  const { session, signOut } = useAuth();
  const profile = useProfile();

  return (
    <ThemedView type="background" style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ThemedView style={styles.container}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={8}>
            <ThemedText type="caption" themeColor="primary" style={styles.back}>
              ‹ Back
            </ThemedText>
          </Pressable>

          <ThemedText type="screenTitle">Settings</ThemedText>

          <Card style={styles.card}>
            <ThemedText style={styles.profileName}>{profile?.display_name ?? '—'}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {session?.user.email}
            </ThemedText>
          </Card>

          <Button title="Sign out" variant="danger" onPress={signOut} />
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  back: { fontWeight: '700' },
  card: {
    gap: Spacing.half,
  },
  profileName: { fontSize: 16, fontWeight: '700' },
});
