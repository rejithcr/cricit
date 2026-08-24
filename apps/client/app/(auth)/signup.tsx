import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { colors, typography } from '../../src/theme';
import { TextInput } from '../../src/components/ui/TextInput';
import { Button } from '../../src/components/ui/Button';
import { authService } from '../../src/services/auth';

/**
 * Sign-up screen — create an account with email + password.
 * On success, shows a prompt to verify email before logging in.
 */
export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSignUpComplete, setIsSignUpComplete] = useState(false);

  async function handleSignUp() {
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    const { error } = await authService.signUpWithEmail(email.trim(), password);
    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setIsSignUpComplete(true);
  }

  if (isSignUpComplete) {
    return (
      <View style={styles.centeredContainer}>
        <View style={styles.successCard}>
          <Text style={styles.successEmoji}>✉️</Text>
          <Text style={styles.successTitle}>Check your email</Text>
          <Text style={styles.successBody}>
            We sent a verification link to{' '}
            <Text style={styles.emailHighlight}>{email}</Text>. Tap the link to
            activate your account, then come back here to log in.
          </Text>
          <Link href="/(auth)/login" asChild>
            <Button title="Back to Log In" onPress={() => {}} variant="primary" />
          </Link>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.appName}>CricIt</Text>
          <Text style={styles.tagline}>Join the community</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create Account</Text>

          <TextInput
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <TextInput
            label="Password"
            placeholder="At least 6 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
          />

          <TextInput
            label="Confirm Password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
          />

          {errorMessage ? (
            <Text style={styles.errorBanner}>{errorMessage}</Text>
          ) : null}

          <Button
            title="Sign Up"
            onPress={handleSignUp}
            isLoading={isLoading}
            style={styles.signUpButton}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <Button title="Log In" onPress={() => {}} variant="text" />
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: typography.largeTitle.fontSize,
    fontWeight: typography.largeTitle.fontWeight,
    letterSpacing: typography.largeTitle.letterSpacing,
    color: colors.whatsappGreen,
  },
  tagline: {
    fontSize: typography.bodyMd.fontSize,
    fontWeight: typography.bodyMd.fontWeight,
    color: colors.systemGray,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: typography.headlineMd.fontSize,
    fontWeight: typography.headlineMd.fontWeight,
    letterSpacing: typography.headlineMd.letterSpacing,
    color: colors.onSurface,
    marginBottom: 24,
  },
  errorBanner: {
    fontSize: typography.caption.fontSize,
    color: colors.error,
    backgroundColor: colors.errorContainer,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  signUpButton: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: typography.bodyMd.fontSize,
    color: colors.systemGray,
  },
  successCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  successEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: typography.headlineMd.fontSize,
    fontWeight: typography.headlineMd.fontWeight,
    color: colors.onSurface,
    marginBottom: 12,
  },
  successBody: {
    fontSize: typography.bodyMd.fontSize,
    color: colors.systemGray,
    textAlign: 'center',
    lineHeight: typography.bodyMd.lineHeight,
    marginBottom: 24,
  },
  emailHighlight: {
    fontWeight: '600',
    color: colors.onSurface,
  },
});
