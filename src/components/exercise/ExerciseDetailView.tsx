import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Pencil, Trash2 } from 'lucide-react-native';

import {
  formatEquipmentLabel,
  formatMuscleLabel,
} from '@/constants/exercises';
import {
  FontSize,
  FontWeight,
  getColors,
  Layout,
  Spacing,
} from '@/constants/theme';
import {
  getExerciseHistory,
  type ExerciseHistoryEntry,
} from '@/services/exerciseService';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import type { Exercise, WeightUnit } from '@/types/database';

interface ExerciseDetailViewProps {
  exercise: Exercise;
  onChangePreferredUnit: (unit: WeightUnit | null) => Promise<void>;
  onPressEdit?: () => void;
  onPressDelete?: () => Promise<void>;
}

export function ExerciseDetailView({
  exercise,
  onChangePreferredUnit,
  onPressEdit,
  onPressDelete,
}: ExerciseDetailViewProps) {
  const theme = useSettingsStore((s) => s.theme);
  const defaultUnit = useSettingsStore((s) => s.defaultWeightUnit);
  const colors = getColors(theme);
  const getActiveUserId = useAuthStore((s) => s.getActiveUserId);

  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    let active = true;
    setLoadingHistory(true);
    getExerciseHistory(getActiveUserId(), exercise.id)
      .then((entries) => {
        if (active) setHistory(entries);
      })
      .finally(() => {
        if (active) setLoadingHistory(false);
      });
    return () => {
      active = false;
    };
  }, [exercise.id, getActiveUserId]);

  const handleDeletePress = () => {
    if (!onPressDelete) return;
    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm(`Delete "${exercise.name}"?`)
      ) {
        void onPressDelete();
      }
      return;
    }

    Alert.alert(
      'Delete Custom Exercise',
      `Are you sure you want to delete "${exercise.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void onPressDelete(),
        },
      ],
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {exercise.name}
          </Text>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                { backgroundColor: colors.surfaceElevated },
              ]}
            >
              <Text style={[styles.badgeText, { color: colors.textPrimary }]}>
                {formatMuscleLabel(exercise.primary_muscle)}
              </Text>
            </View>
            <View
              style={[
                styles.badge,
                { backgroundColor: colors.surfaceElevated },
              ]}
            >
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                {formatEquipmentLabel(exercise.equipment)}
              </Text>
            </View>
            {exercise.is_custom ? (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: `${colors.primary}22` },
                ]}
              >
                <Text style={[styles.badgeText, { color: colors.primary }]}>
                  Custom
                </Text>
              </View>
            ) : null}
          </View>
          {exercise.secondary_muscles.length > 0 ? (
            <Text style={[styles.secondaryText, { color: colors.textSecondary }]}>
              Secondary:{' '}
              {exercise.secondary_muscles.map(formatMuscleLabel).join(', ')}
            </Text>
          ) : null}
        </View>

        {exercise.is_custom ? (
          <View style={styles.actionsRow}>
            {onPressEdit ? (
              <Pressable
                onPress={onPressEdit}
                style={[
                  styles.iconBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: Layout.radius.md,
                  },
                ]}
                accessibilityLabel="Edit exercise"
              >
                <Pencil size={18} color={colors.textPrimary} />
              </Pressable>
            ) : null}
            {onPressDelete ? (
              <Pressable
                onPress={handleDeletePress}
                style={[
                  styles.iconBtn,
                  {
                    backgroundColor: colors.dangerMuted,
                    borderColor: colors.danger,
                    borderRadius: Layout.radius.md,
                  },
                ]}
                accessibilityLabel="Delete exercise"
              >
                <Trash2 size={18} color={colors.danger} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* Preferred Weight Unit */}
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
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Weight Unit Override
        </Text>
        <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
          Current app default: {defaultUnit.toUpperCase()}
        </Text>
        <View style={styles.segmentedRow}>
          {(
            [
              { value: null, label: `Default (${defaultUnit})` },
              { value: 'kg', label: 'kg' },
              { value: 'lbs', label: 'lbs' },
            ] as const
          ).map((opt) => {
            const active = exercise.preferred_weight_unit === opt.value;
            return (
              <Pressable
                key={String(opt.value)}
                onPress={() => void onChangePreferredUnit(opt.value)}
                style={[
                  styles.segmentBtn,
                  {
                    backgroundColor: active
                      ? colors.primary
                      : colors.background,
                    borderColor: active ? colors.primary : colors.border,
                    borderRadius: Layout.radius.md,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: active ? '#FFFFFF' : colors.textSecondary },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Instructions */}
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
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Instructions
        </Text>
        {exercise.instructions.length === 0 ? (
          <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
            No instructions provided.
          </Text>
        ) : (
          <View style={styles.stepsList}>
            {exercise.instructions.map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <View
                  style={[
                    styles.stepNum,
                    { backgroundColor: `${colors.primary}22` },
                  ]}
                >
                  <Text style={[styles.stepNumText, { color: colors.primary }]}>
                    {index + 1}
                  </Text>
                </View>
                <Text style={[styles.stepText, { color: colors.textPrimary }]}>
                  {step}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Exercise History */}
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
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Recent History
        </Text>
        {loadingHistory ? (
          <ActivityIndicator color={colors.primary} />
        ) : history.length === 0 ? (
          <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
            You haven&apos;t logged this exercise yet.
          </Text>
        ) : (
          <View style={styles.historyList}>
            {history.map((entry) => (
              <View
                key={`${entry.workoutId}-${entry.startedAt}`}
                style={[
                  styles.historyItem,
                  { borderTopColor: colors.border },
                ]}
              >
                <View style={styles.historyHeader}>
                  <Text
                    style={[styles.historyWorkout, { color: colors.textPrimary }]}
                  >
                    {entry.workoutName}
                  </Text>
                  <Text
                    style={[styles.historyDate, { color: colors.textSecondary }]}
                  >
                    {new Date(entry.startedAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.setsWrap}>
                  {entry.sets.map((s) => (
                    <Text
                      key={s.id}
                      style={[
                        styles.setChip,
                        {
                          backgroundColor: colors.background,
                          color: s.is_completed
                            ? colors.textPrimary
                            : colors.textSecondary,
                          borderRadius: Layout.radius.sm,
                        },
                      ]}
                    >
                      {s.weight} {entry.weightUnit} × {s.reps}
                      {s.rpe ? ` @${s.rpe}` : ''}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  headerTitleWrap: {
    flex: 1,
    gap: Spacing.xs,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs + 2,
    borderRadius: Layout.radius.sm,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  secondaryText: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xxs,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
  },
  sectionSub: {
    fontSize: FontSize.sm,
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  segmentBtn: {
    flex: 1,
    borderWidth: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  stepsList: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: Layout.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  stepText: {
    flex: 1,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  historyList: {
    gap: Spacing.sm,
  },
  historyItem: {
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyWorkout: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  historyDate: {
    fontSize: FontSize.xs,
  },
  setsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  setChip: {
    fontSize: FontSize.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs + 2,
    overflow: 'hidden',
  },
});
