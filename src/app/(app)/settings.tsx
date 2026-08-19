import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useProfile } from '@/hooks/use-profile';

export default function SettingsScreen() {
  const { session, signOut } = useAuth();
  const profile = useProfile();

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <ThemedView style={styles.container}>
          <ThemedText type="title" style={styles.title}>
            Settings
          </ThemedText>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">{profile?.display_name ?? '—'}</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              {session?.user.email}
            </ThemedText>
          </ThemedView>

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
  title: { fontSize: 28, lineHeight: 34 },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
});
