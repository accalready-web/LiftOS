import { StyleSheet, Text, View } from 'react-native';
import { getColors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useSettingsStore } from '@/stores/useSettingsStore';

export default function WorkoutHubScreen() {
  const theme = useSettingsStore((s) => s.theme);
  const colors = getColors(theme);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Workout</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Start an empty workout or choose a routine
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.base,
  },
});
