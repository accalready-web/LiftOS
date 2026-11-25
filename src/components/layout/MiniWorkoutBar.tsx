import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { getColors, Layout, Spacing, FontSize, FontWeight } from '@/constants/theme';
import { useSettingsStore } from '@/stores/useSettingsStore';

/**
 * MiniWorkoutBar — Persistent bar shown above the tab bar
 * when an active workout is minimized.
 * Currently a placeholder; will be wired to useActiveWorkoutStore in Step 2.3.
 */

interface MiniWorkoutBarProps {
  /** Whether an active workout is in progress */
  visible: boolean;
  /** Workout name or fallback label */
  workoutName?: string;
  /** Elapsed time formatted as mm:ss */
  elapsedTime?: string;
  /** Called when the bar is tapped to resume the workout */
  onPress?: () => void;
}

export function MiniWorkoutBar({
  visible,
  workoutName = 'Workout in progress',
  elapsedTime = '00:00',
  onPress,
}: MiniWorkoutBarProps) {
  const theme = useSettingsStore((s) => s.theme);
  const colors = getColors(theme);

  if (!visible) return null;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: colors.primary,
          height: Layout.miniWorkoutBarHeight,
        },
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {workoutName}
        </Text>
        <Text style={styles.timer}>{elapsedTime}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    flex: 1,
    marginRight: Spacing.md,
  },
  timer: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    fontVariant: ['tabular-nums'],
  },
});
