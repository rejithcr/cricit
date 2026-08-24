import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { colors, typography } from '../../src/theme';
import { TextInput } from '../../src/components/ui/TextInput';
import { Button } from '../../src/components/ui/Button';
import { authService } from '../../src/services/auth';

/**
 * Login screen — email + password authentication.
 */
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  console.log("LoginScreen mounted, returnTo:", returnTo);

  async function handleLogin() {
    setErrorMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    const { error } = await authService.signInWithEmail(email.trim(), password);
    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    // The AuthContext will react to the session state change 
    // and the Route Guard in _layout.tsx will automatically redirect 
    // the user to the correct screen (either home or the returnTo URL).
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
          <Text style={styles.tagline}>Your cricket community</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Log In</Text>

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
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
          />

          {errorMessage ? (
            <Text style={styles.errorBanner}>{errorMessage}</Text>
          ) : null}

          <Button
            title="Log In"
            onPress={handleLogin}
            isLoading={isLoading}
            style={styles.loginButton}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/signup" asChild>
            <Button title="Sign Up" onPress={() => {}} variant="text" />
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
  loginButton: {
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
});
