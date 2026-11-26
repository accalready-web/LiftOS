import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { Dumbbell, CloudOff, Mail, Lock } from 'lucide-react-native';

import {
  getColors,
  Layout,
  Spacing,
  FontSize,
  FontWeight,
} from '@/constants/theme';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function LoginScreen() {
  const theme = useSettingsStore((s) => s.theme);
  const colors = getColors(theme);

  const { signIn, signUp, continueLocalOnly, isLoading, error, clearError } =
    useAuthStore();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    clearError();
    setInfoMessage(null);

    if (!email.trim() || !password) {
      setInfoMessage('Please enter both email and password.');
      return;
    }

    if (mode === 'signin') {
      const ok = await signIn(email, password);
      if (ok) {
        router.replace('/(tabs)/');
      }
    } else {
      const result = await signUp(email, password);
      if (result.success) {
        if (result.needsEmailConfirmation) {
          setInfoMessage(
            'Account created! Please check your email to confirm your address before signing in.',
          );
          setMode('signin');
        } else {
          router.replace('/(tabs)/');
        }
      }
    }
  };

  const handleLocalOnly = () => {
    continueLocalOnly();
    router.replace('/(tabs)/');
  };

  const toggleMode = () => {
    clearError();
    setInfoMessage(null);
    setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'));
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: Layout.radius.lg,
            },
          ]}
        >
          {/* Brand Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.logoCircle,
                { backgroundColor: `${colors.primary}18` },
              ]}
            >
              <Dumbbell size={28} color={colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              LiftOS
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {mode === 'signin'
                ? 'Sign in to sync workouts across devices'
                : 'Create an account for cloud backup & sync'}
            </Text>
          </View>

          {/* Unconfigured Supabase Notice */}
          {!isSupabaseConfigured && (
            <View
              style={[
                styles.banner,
                {
                  backgroundColor: `${colors.warning}15`,
                  borderColor: colors.warning,
                },
              ]}
            >
              <Text style={[styles.bannerText, { color: colors.warning }]}>
                Cloud sync keys (.env) not configured yet. You can use
                Local-Only mode immediately.
              </Text>
            </View>
          )}

          {/* Error / Info Banner */}
          {error && (
            <View
              style={[
                styles.banner,
                {
                  backgroundColor: colors.dangerMuted,
                  borderColor: colors.danger,
                },
              ]}
            >
              <Text style={[styles.bannerText, { color: colors.danger }]}>
                {error}
              </Text>
            </View>
          )}

          {infoMessage && (
            <View
              style={[
                styles.banner,
                {
                  backgroundColor: colors.successMuted,
                  borderColor: colors.success,
                },
              ]}
            >
              <Text style={[styles.bannerText, { color: colors.success }]}>
                {infoMessage}
              </Text>
            </View>
          )}

          {/* Email Input */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Email
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                  borderRadius: Layout.radius.md,
                },
              ]}
            >
              <Mail size={18} color={colors.textSecondary} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { color: colors.textPrimary }]}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Password
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                  borderRadius: Layout.radius.md,
                },
              ]}
            >
              <Lock size={18} color={colors.textSecondary} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                autoCapitalize="none"
                style={[styles.input, { color: colors.textPrimary }]}
              />
            </View>
          </View>

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: pressed
                  ? colors.primaryPressed
                  : colors.primary,
                borderRadius: Layout.radius.md,
                opacity: isLoading ? 0.7 : 1,
              },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </Pressable>

          {/* Switch Mode */}
          <Pressable onPress={toggleMode} style={styles.switchButton}>
            <Text style={[styles.switchText, { color: colors.textSecondary }]}>
              {mode === 'signin'
                ? "Don't have an account? "
                : 'Already have an account? '}
              <Text style={{ color: colors.primary, fontWeight: FontWeight.semibold }}>
                {mode === 'signin' ? 'Sign Up' : 'Sign In'}
              </Text>
            </Text>
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>
              OR
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Local-Only Mode */}
          <Pressable
            onPress={handleLocalOnly}
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                backgroundColor: pressed
                  ? colors.surfaceElevated
                  : 'transparent',
                borderColor: colors.border,
                borderRadius: Layout.radius.md,
              },
            ]}
          >
            <CloudOff size={18} color={colors.textSecondary} />
            <Text
              style={[
                styles.secondaryButtonText,
                { color: colors.textPrimary },
              ]}
            >
              Continue Local-Only (Offline)
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    padding: Spacing.xxl,
    borderWidth: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  banner: {
    padding: Spacing.md,
    borderRadius: Layout.radius.sm,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  bannerText: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  fieldGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    minHeight: Layout.minTouchTarget,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.base,
    paddingVertical: Spacing.sm,
  },
  primaryButton: {
    minHeight: Layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  switchText: {
    fontSize: FontSize.sm,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  secondaryButton: {
    flexDirection: 'row',
    minHeight: Layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: Spacing.sm,
  },
  secondaryButtonText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
  },
});
