import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { getColors } from '@/constants/theme';

export default function RootLayout() {
  const theme = useSettingsStore((s) => s.theme);
  const colors = getColors(theme);

  const initialize = useAuthStore((s) => s.initialize);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const session = useAuthStore((s) => s.session);
  const isLocalOnly = useAuthStore((s) => s.isLocalOnly);
  const syncNow = useAuthStore((s) => s.syncNow);
  const setSyncStatus = useAuthStore((s) => s.setSyncStatus);
  const segments = useSegments();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  // Auto-sync when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && session?.user) {
        void syncNow();
      }
    });
    return () => subscription.remove();
  }, [session, syncNow]);

  // Auto-sync when Web browser comes back online
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleOnline = () => {
      if (session?.user) {
        void syncNow();
      }
    };
    const handleOffline = () => {
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [session, syncNow, setSyncStatus]);

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isAuthenticatedOrLocal = Boolean(session) || isLocalOnly;

    if (!isAuthenticatedOrLocal && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticatedOrLocal && inAuthGroup) {
      router.replace('/(tabs)/');
    }
  }, [isInitialized, session, isLocalOnly, segments]);

  return (
    <>
      <StatusBar style={colors.statusBarStyle} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="exercises/[id]" />
        <Stack.Screen name="routine/[id]" />
      </Stack>
    </>
  );
}
