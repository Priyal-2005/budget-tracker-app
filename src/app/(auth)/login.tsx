import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError(null);
    setIsLoading(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setIsLoading(false);
    if (signInError) setError(signInError);
  };

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <ThemedText type="title" style={styles.title}>
              Welcome back
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              Log in to track this month&apos;s budget.
            </ThemedText>

            <ThemedView style={styles.form}>
              <FormField
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                placeholder="you@college.edu"
              />
              <FormField
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                placeholder="••••••••"
              />

              {error && (
                <ThemedText themeColor="danger" type="small">
                  {error}
                </ThemedText>
              )}

              <Button title="Log in" onPress={handleLogin} isLoading={isLoading} />
            </ThemedView>

            <ThemedView style={styles.footer}>
              <ThemedText themeColor="textSecondary" type="small">
                Don&apos;t have an account?
              </ThemedText>
              <Link href="/(auth)/signup" replace>
                <ThemedText type="smallBold" themeColor="primary">
                  Sign up
                </ThemedText>
              </Link>
            </ThemedView>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  title: { fontSize: 32, lineHeight: 38 },
  subtitle: {},
  form: { gap: Spacing.three },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
});
