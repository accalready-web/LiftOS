import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CustomExerciseModal } from '@/components/exercise/CustomExerciseModal';
import { ExerciseDetailView } from '@/components/exercise/ExerciseDetailView';
import {
  FontSize,
  FontWeight,
  getColors,
  Spacing,
} from '@/constants/theme';
import {
  deleteCustomExercise,
  getExerciseById,
  setExercisePreferredWeightUnit,
  updateCustomExercise,
  type CustomExerciseInput,
} from '@/services/exerciseService';
import { useSettingsStore } from '@/stores/useSettingsStore';
import type { Exercise, WeightUnit } from '@/types/database';

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const theme = useSettingsStore((s) => s.theme);
  const colors = getColors(theme);

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const loadExercise = useCallback(async () => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const found = await getExerciseById(id);
      setExercise(found);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadExercise();
  }, [loadExercise]);

  const handleChangeUnit = async (unit: WeightUnit | null) => {
    if (!exercise) return;
    const updated = await setExercisePreferredWeightUnit(exercise.id, unit);
    setExercise(updated);
  };

  const handleSaveEdit = async (input: CustomExerciseInput) => {
    if (!exercise) return;
    const updated = await updateCustomExercise(exercise.id, input);
    setExercise(updated);
  };

  const handleDelete = async () => {
    if (!exercise) return;
    await deleteCustomExercise(exercise.id);
    router.back();
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      {/* Top Bar */}
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={8}
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
          <Text style={[styles.backText, { color: colors.textPrimary }]}>
            Exercises
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !exercise ? (
        <View style={styles.center}>
          <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>
            Exercise not found.
          </Text>
        </View>
      ) : (
        <ExerciseDetailView
          exercise={exercise}
          onChangePreferredUnit={handleChangeUnit}
          onPressEdit={() => setEditModalVisible(true)}
          onPressDelete={handleDelete}
        />
      )}

      <CustomExerciseModal
        visible={editModalVisible}
        initialExercise={exercise}
        onClose={() => setEditModalVisible(false)}
        onSave={handleSaveEdit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  notFoundText: {
    fontSize: FontSize.base,
  },
});
