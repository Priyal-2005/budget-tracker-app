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

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const handleSignup = async () => {
    if (!displayName.trim() || !email.trim() || !password) {
      setError('Fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setIsLoading(true);
    const { error: signUpError, needsEmailConfirmation } = await signUp(
      email.trim(),
      password,
      displayName.trim()
    );
    setIsLoading(false);
    if (signUpError) {
      setError(signUpError);
    } else if (needsEmailConfirmation) {
      setCheckEmail(true);
    }
    // Otherwise a session already exists and the root layout routes into the app.
  };

  if (checkEmail) {
    return (
      <ThemedView type="background" style={styles.flex}>
        <SafeAreaView style={[styles.flex, styles.checkEmailContainer]}>
          <ThemedText style={styles.title}>Check your email</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary" style={styles.subtitle}>
            We sent a confirmation link to {email.trim()}. Confirm it, then come back and log in.
          </ThemedText>
          <Link href="/(auth)/login" replace>
            <ThemedText type="caption" themeColor="primary" style={styles.link}>
              Back to log in
            </ThemedText>
          </Link>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView type="background" style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <ThemedText style={styles.title}>Create account</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary" style={styles.subtitle}>
              Track your budget, buffer, and savings goals.
            </ThemedText>

            <ThemedView style={styles.form}>
              <FormField
                label="Name"
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                autoCapitalize="words"
              />
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
                autoComplete="password-new"
                placeholder="At least 6 characters"
              />
              <FormField
                label="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="••••••••"
              />

              {error && (
                <ThemedText themeColor="danger" type="caption">
                  {error}
                </ThemedText>
              )}

              <Button title="Sign up" onPress={handleSignup} isLoading={isLoading} />
            </ThemedView>

            <ThemedView style={styles.footer}>
              <ThemedText type="caption" themeColor="textSecondary">
                Already have an account?
              </ThemedText>
              <Link href="/(auth)/login" replace>
                <ThemedText type="caption" themeColor="primary" style={styles.link}>
                  Log in
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
  checkEmailContainer: {
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.6 },
  subtitle: {},
  form: { gap: Spacing.three, marginTop: Spacing.two },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  link: { fontWeight: '700' },
});
