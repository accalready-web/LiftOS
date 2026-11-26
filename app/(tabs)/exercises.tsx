import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CustomExerciseModal } from '@/components/exercise/CustomExerciseModal';
import { ExerciseDetailView } from '@/components/exercise/ExerciseDetailView';
import { ExercisePicker } from '@/components/exercise/ExercisePicker';
import {
  FontSize,
  FontWeight,
  getColors,
  Layout,
  Spacing,
} from '@/constants/theme';
import {
  createCustomExercise,
  deleteCustomExercise,
  listExercises,
  setExercisePreferredWeightUnit,
  updateCustomExercise,
  type CustomExerciseInput,
} from '@/services/exerciseService';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import type {
  EquipmentType,
  Exercise,
  MuscleGroup,
  WeightUnit,
} from '@/types/database';

export default function ExercisesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= Layout.desktopBreakpoint;
  const insets = useSafeAreaInsets();

  const theme = useSettingsStore((s) => s.theme);
  const colors = getColors(theme);
  const getActiveUserId = useAuthStore((s) => s.getActiveUserId);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'all'>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentType | 'all'>('all');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  const loadExercises = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await listExercises({
        search: searchQuery,
        muscle: selectedMuscle,
        equipment: selectedEquipment,
      });
      setExercises(items);
      setSelectedExercise((prev) => {
        if (!prev) return items[0] ?? null;
        return items.find((e) => e.id === prev.id) ?? items[0] ?? null;
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedMuscle, selectedEquipment]);

  useEffect(() => {
    void loadExercises();
  }, [loadExercises]);

  useFocusEffect(
    useCallback(() => {
      void loadExercises();
    }, [loadExercises]),
  );

  const handleSelectExercise = (exercise: Exercise) => {
    if (isDesktop) {
      setSelectedExercise(exercise);
    } else {
      router.push(`/exercises/${exercise.id}`);
    }
  };

  const handleSaveCustomExercise = async (input: CustomExerciseInput) => {
    const saved = editingExercise
      ? await updateCustomExercise(editingExercise.id, input)
      : await createCustomExercise(getActiveUserId(), input);
    await loadExercises();
    setSelectedExercise(saved);
  };

  const handleChangeUnit = async (unit: WeightUnit | null) => {
    if (!selectedExercise) return;
    const updated = await setExercisePreferredWeightUnit(selectedExercise.id, unit);
    setSelectedExercise(updated);
    setExercises((prev) =>
      prev.map((ex) => (ex.id === updated.id ? updated : ex)),
    );
  };

  const handleDeleteSelected = async () => {
    if (!selectedExercise) return;
    await deleteCustomExercise(selectedExercise.id);
    setSelectedExercise(null);
    await loadExercises();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: isDesktop ? 0 : insets.top,
        },
      ]}
    >
      <View
        style={[
          styles.body,
          { flexDirection: isDesktop ? 'row' : 'column' },
        ]}
      >
        {/* Left Pane (or Full Mobile List) */}
        <View
          style={[
            isDesktop ? styles.leftPane : styles.fullPane,
            isDesktop && { borderRightColor: colors.border },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Exercises
            </Text>
            <Text style={[styles.countText, { color: colors.textSecondary }]}>
              {exercises.length} exercises
            </Text>
          </View>

          <ExercisePicker
            exercises={exercises}
            selectedExerciseId={isDesktop ? selectedExercise?.id : null}
            searchQuery={searchQuery}
            onChangeSearchQuery={setSearchQuery}
            selectedMuscle={selectedMuscle}
            onChangeMuscle={setSelectedMuscle}
            selectedEquipment={selectedEquipment}
            onChangeEquipment={setSelectedEquipment}
            onSelectExercise={handleSelectExercise}
            onPressCreateCustom={() => {
              setEditingExercise(null);
              setModalVisible(true);
            }}
            isLoading={isLoading}
          />
        </View>

        {/* Right Pane (Desktop Split-Pane Detail) */}
        {isDesktop ? (
          <View style={styles.rightPane}>
            {selectedExercise ? (
              <ExerciseDetailView
                exercise={selectedExercise}
                onChangePreferredUnit={handleChangeUnit}
                onPressEdit={() => {
                  setEditingExercise(selectedExercise);
                  setModalVisible(true);
                }}
                onPressDelete={handleDeleteSelected}
              />
            ) : (
              <View style={styles.emptyDetail}>
                <Text
                  style={[styles.emptyDetailText, { color: colors.textSecondary }]}
                >
                  Select an exercise to view instructions and history
                </Text>
              </View>
            )}
          </View>
        ) : null}
      </View>

      <CustomExerciseModal
        visible={modalVisible}
        initialExercise={editingExercise}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveCustomExercise}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  fullPane: {
    flex: 1,
  },
  leftPane: {
    width: '44%',
    minWidth: 340,
    maxWidth: 460,
    borderRightWidth: 1,
  },
  rightPane: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  countText: {
    fontSize: FontSize.xs,
  },
  emptyDetail: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  emptyDetailText: {
    fontSize: FontSize.base,
  },
});
