import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { getColors } from '@/constants/theme';

export default function RootLayout() {
  const theme = useSettingsStore((s) => s.theme);
  const colors = getColors(theme);

  return (
    <>
      <StatusBar style={colors.statusBarStyle} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </>
  );
}
