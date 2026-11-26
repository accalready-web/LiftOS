import { useEffect } from 'react';
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
  const segments = useSegments();

  useEffect(() => {
    void initialize();
  }, [initialize]);

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
      </Stack>
    </>
  );
}
