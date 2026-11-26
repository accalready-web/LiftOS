import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Plus,
  Trash2,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CustomExerciseModal } from '@/components/exercise/CustomExerciseModal';
import { ExercisePicker } from '@/components/exercise/ExercisePicker';
import {
  formatEquipmentLabel,
  formatMuscleLabel,
} from '@/constants/exercises';
import {
  FontSize,
  FontWeight,
  getColors,
  Layout,
  SetTypeBadgeColors,
  Spacing,
  type SetType,
} from '@/constants/theme';
import {
  createCustomExercise,
  listExercises,
  type CustomExerciseInput,
} from '@/services/exerciseService';
import {
  getRoutineWithDetails,
  listRoutineFolders,
  saveRoutineWithDetails,
} from '@/services/routineService';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import type {
  EquipmentType,
  Exercise,
  MuscleGroup,
  RoutineFolder,
} from '@/types/database';
import { generateUuid } from '@/utils/uuid';

// ─── Draft Types ────────────────────────────────────────────────

interface DraftSet {
  localKey: string;
  id?: string;
  set_type: SetType;
  weight: string;
  reps: string;
  rpe: string;
}

interface DraftExercise {
  localKey: string;
  id?: string;
  exercise: Exercise;
  restSeconds: string;
  notes: string;
  sets: DraftSet[];
}

const SET_TYPE_ORDER: SetType[] = ['normal', 'warmup', 'dropset', 'failure'];

function nextSetType(current: SetType): SetType {
  const idx = SET_TYPE_ORDER.indexOf(current);
  return SET_TYPE_ORDER[(idx + 1) % SET_TYPE_ORDER.length];
}

function parseNullableNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : null;
}

function parseNullableInt(raw: string): number | null {
  const num = parseNullableNumber(raw);
  return num === null ? null : Math.round(num);
}

// ─── Screen ─────────────────────────────────────────────────────

export default function RoutineBuilderScreen() {
  const { id, folderId } = useLocalSearchParams<{
    id: string;
    folderId?: string;
  }>();
  const isNew = !id || id === 'new';

  const { width } = useWindowDimensions();
  const isDesktop = width >= Layout.desktopBreakpoint;
  const insets = useSafeAreaInsets();

  const theme = useSettingsStore((s) => s.theme);
  const defaultRestSeconds = useSettingsStore((s) => s.defaultRestSeconds);
  const defaultUnit = useSettingsStore((s) => s.defaultWeightUnit);
  const colors = getColors(theme);
  const getActiveUserId = useAuthStore((s) => s.getActiveUserId);

  // Routine Form State
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
    folderId ?? null,
  );
  const [folders, setFolders] = useState<RoutineFolder[]>([]);
  const [draftExercises, setDraftExercises] = useState<DraftExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Exercise Picker State
  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [pickerExercises, setPickerExercises] = useState<Exercise[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | 'all'>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<
    EquipmentType | 'all'
  >('all');

  const loadPickerExercises = useCallback(async () => {
    const items = await listExercises({
      search: searchQuery,
      muscle: selectedMuscle,
      equipment: selectedEquipment,
    });
    setPickerExercises(items);
  }, [searchQuery, selectedMuscle, selectedEquipment]);

  useEffect(() => {
    void loadPickerExercises();
  }, [loadPickerExercises]);

  useEffect(() => {
    let active = true;
    const userId = getActiveUserId();

    (async () => {
      setIsLoading(true);
      try {
        const loadedFolders = await listRoutineFolders(userId);
        if (!active) return;
        setFolders(loadedFolders);

        if (!isNew && id) {
          const routine = await getRoutineWithDetails(id);
          if (!active) return;
          if (routine) {
            setName(routine.name);
            setNotes(routine.notes ?? '');
            setSelectedFolderId(routine.folder_id);
            setDraftExercises(
              routine.exercises
                .filter((re) => re.exercise !== null)
                .map((re) => ({
                  localKey: re.id,
                  id: re.id,
                  exercise: re.exercise!,
                  restSeconds:
                    re.rest_seconds !== null ? String(re.rest_seconds) : '',
                  notes: re.notes ?? '',
                  sets: re.sets.map((s) => ({
                    localKey: s.id,
                    id: s.id,
                    set_type: s.set_type,
                    weight:
                      s.target_weight !== null ? String(s.target_weight) : '',
                    reps: s.target_reps !== null ? String(s.target_reps) : '',
                    rpe: s.target_rpe !== null ? String(s.target_rpe) : '',
                  })),
                })),
            );
          }
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [id, isNew, getActiveUserId]);

  const handleAddExercise = (exercise: Exercise) => {
    setDraftExercises((prev) => [
      ...prev,
      {
        localKey: generateUuid(),
        exercise,
        restSeconds: String(defaultRestSeconds),
        notes: '',
        sets: [
          {
            localKey: generateUuid(),
            set_type: 'normal',
            weight: '',
            reps: '10',
            rpe: '',
          },
          {
            localKey: generateUuid(),
            set_type: 'normal',
            weight: '',
            reps: '10',
            rpe: '',
          },
          {
            localKey: generateUuid(),
            set_type: 'normal',
            weight: '',
            reps: '10',
            rpe: '',
          },
        ],
      },
    ]);
    if (!isDesktop) {
      setPickerModalVisible(false);
    }
  };

  const handleMoveExercise = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draftExercises.length) return;
    setDraftExercises((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const handleRemoveExercise = (localKey: string) => {
    setDraftExercises((prev) => prev.filter((e) => e.localKey !== localKey));
  };

  const handleAddSet = (exerciseKey: string) => {
    setDraftExercises((prev) =>
      prev.map((ex) => {
        if (ex.localKey !== exerciseKey) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              localKey: generateUuid(),
              set_type: 'normal',
              weight: lastSet?.weight ?? '',
              reps: lastSet?.reps ?? '10',
              rpe: lastSet?.rpe ?? '',
            },
          ],
        };
      }),
    );
  };

  const handleRemoveSet = (exerciseKey: string, setKey: string) => {
    setDraftExercises((prev) =>
      prev.map((ex) => {
        if (ex.localKey !== exerciseKey) return ex;
        return {
          ...ex,
          sets: ex.sets.filter((s) => s.localKey !== setKey),
        };
      }),
    );
  };

  const handleUpdateSet = (
    exerciseKey: string,
    setKey: string,
    patch: Partial<DraftSet>,
  ) => {
    setDraftExercises((prev) =>
      prev.map((ex) => {
        if (ex.localKey !== exerciseKey) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) =>
            s.localKey === setKey ? { ...s, ...patch } : s,
          ),
        };
      }),
    );
  };

  const handleCreateCustomExercise = async (input: CustomExerciseInput) => {
    const created = await createCustomExercise(getActiveUserId(), input);
    await loadPickerExercises();
    handleAddExercise(created);
  };

  const handleSaveRoutine = async () => {
    if (!name.trim()) {
      setError('Please enter a routine name.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await saveRoutineWithDetails(getActiveUserId(), {
        id: isNew ? undefined : id,
        folder_id: selectedFolderId,
        name: name.trim(),
        notes: notes.trim() || null,
        exercises: draftExercises.map((ex) => ({
          id: ex.id,
          exercise_id: ex.exercise.id,
          rest_seconds: parseNullableInt(ex.restSeconds),
          notes: ex.notes.trim() || null,
          sets: ex.sets.map((s) => ({
            id: s.id,
            set_type: s.set_type,
            target_weight: parseNullableNumber(s.weight),
            target_reps: parseNullableInt(s.reps),
            target_reps_max: null,
            target_rpe: parseNullableNumber(s.rpe),
          })),
        })),
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save routine');
    } finally {
      setIsSaving(false);
    }
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
          style={styles.backBtn}
          hitSlop={8}
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
          <Text style={[styles.topBarTitle, { color: colors.textPrimary }]}>
            {isNew ? 'New Routine' : 'Edit Routine'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => void handleSaveRoutine()}
          disabled={isSaving || isLoading}
          style={[
            styles.saveBtn,
            {
              backgroundColor: colors.primary,
              borderRadius: Layout.radius.md,
              opacity: isSaving || isLoading ? 0.6 : 1,
            },
          ]}
        >
          <Text style={styles.saveBtnText}>
            {isSaving ? 'Saving...' : 'Save Routine'}
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <View
          style={[
            styles.workspace,
            { flexDirection: isDesktop ? 'row' : 'column' },
          ]}
        >
          {/* Left / Main Editor */}
          <ScrollView
            style={styles.editorScroll}
            contentContainerStyle={styles.editorContent}
            keyboardShouldPersistTaps="handled"
          >
            {error ? (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: colors.dangerMuted,
                    borderColor: colors.danger,
                    borderRadius: Layout.radius.md,
                  },
                ]}
              >
                <Text style={[styles.errorText, { color: colors.danger }]}>
                  {error}
                </Text>
              </View>
            ) : null}

            {/* Routine Name */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Routine Name *
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Push Day A"
                placeholderTextColor={colors.textSecondary}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                    borderRadius: Layout.radius.md,
                  },
                ]}
              />
            </View>

            {/* Folder Selector */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Folder
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.folderChips}
              >
                <Pressable
                  onPress={() => setSelectedFolderId(null)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        selectedFolderId === null
                          ? colors.primary
                          : colors.surface,
                      borderColor:
                        selectedFolderId === null
                          ? colors.primary
                          : colors.border,
                      borderRadius: Layout.radius.full,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color:
                          selectedFolderId === null
                            ? '#FFFFFF'
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    Unfiled
                  </Text>
                </Pressable>
                {folders.map((folder) => {
                  const active = selectedFolderId === folder.id;
                  return (
                    <Pressable
                      key={folder.id}
                      onPress={() => setSelectedFolderId(folder.id)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active
                            ? colors.primary
                            : colors.surface,
                          borderColor: active ? colors.primary : colors.border,
                          borderRadius: Layout.radius.full,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: active ? '#FFFFFF' : colors.textSecondary,
                          },
                        ]}
                      >
                        {folder.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Routine Notes */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Notes (Optional)
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Focus on controlled eccentric..."
                placeholderTextColor={colors.textSecondary}
                multiline
                style={[
                  styles.notesInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                    borderRadius: Layout.radius.md,
                  },
                ]}
              />
            </View>

            {/* Exercises List */}
            <View style={styles.exercisesSection}>
              <Text
                style={[styles.sectionTitle, { color: colors.textPrimary }]}
              >
                Exercises ({draftExercises.length})
              </Text>

              {draftExercises.length === 0 ? (
                <View
                  style={[
                    styles.emptyExercises,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: Layout.radius.lg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.emptyExText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {isDesktop
                      ? 'Click "+ Add" on any exercise in the right panel to add it here.'
                      : 'Tap "+ Add Exercise" below to build your routine.'}
                  </Text>
                </View>
              ) : (
                draftExercises.map((item, exIndex) => {
                  const unitLabel =
                    item.exercise.preferred_weight_unit ?? defaultUnit;

                  return (
                    <View
                      key={item.localKey}
                      style={[
                        styles.exerciseCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                          borderRadius: Layout.radius.lg,
                        },
                      ]}
                    >
                      {/* Exercise Header */}
                      <View style={styles.exHeader}>
                        <View style={styles.exTitleWrap}>
                          <Text
                            style={[
                              styles.exTitle,
                              { color: colors.textPrimary },
                            ]}
                          >
                            {item.exercise.name}
                          </Text>
                          <Text
                            style={[
                              styles.exMeta,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {formatMuscleLabel(item.exercise.primary_muscle)} ·{' '}
                            {formatEquipmentLabel(item.exercise.equipment)}
                          </Text>
                        </View>

                        <View style={styles.exActions}>
                          <Pressable
                            onPress={() => handleMoveExercise(exIndex, -1)}
                            disabled={exIndex === 0}
                            style={[
                              styles.smallIconBtn,
                              {
                                borderColor: colors.border,
                                opacity: exIndex === 0 ? 0.35 : 1,
                              },
                            ]}
                          >
                            <ArrowUp size={14} color={colors.textSecondary} />
                          </Pressable>
                          <Pressable
                            onPress={() => handleMoveExercise(exIndex, 1)}
                            disabled={exIndex === draftExercises.length - 1}
                            style={[
                              styles.smallIconBtn,
                              {
                                borderColor: colors.border,
                                opacity:
                                  exIndex === draftExercises.length - 1
                                    ? 0.35
                                    : 1,
                              },
                            ]}
                          >
                            <ArrowDown size={14} color={colors.textSecondary} />
                          </Pressable>
                          <Pressable
                            onPress={() => handleRemoveExercise(item.localKey)}
                            style={[
                              styles.smallIconBtn,
                              {
                                borderColor: colors.danger,
                                backgroundColor: colors.dangerMuted,
                              },
                            ]}
                          >
                            <Trash2 size={14} color={colors.danger} />
                          </Pressable>
                        </View>
                      </View>

                      {/* Rest Timer & Notes Row */}
                      <View style={styles.exConfigRow}>
                        <View style={styles.restField}>
                          <Text
                            style={[
                              styles.configLabel,
                              { color: colors.textSecondary },
                            ]}
                          >
                            Rest (s)
                          </Text>
                          <TextInput
                            value={item.restSeconds}
                            onChangeText={(val) =>
                              setDraftExercises((prev) =>
                                prev.map((e) =>
                                  e.localKey === item.localKey
                                    ? { ...e, restSeconds: val }
                                    : e,
                                ),
                              )
                            }
                            keyboardType="numeric"
                            placeholder={String(defaultRestSeconds)}
                            placeholderTextColor={colors.textSecondary}
                            style={[
                              styles.restInput,
                              {
                                backgroundColor: colors.background,
                                borderColor: colors.border,
                                color: colors.textPrimary,
                                borderRadius: Layout.radius.sm,
                              },
                            ]}
                          />
                        </View>
                        <TextInput
                          value={item.notes}
                          onChangeText={(val) =>
                            setDraftExercises((prev) =>
                              prev.map((e) =>
                                e.localKey === item.localKey
                                  ? { ...e, notes: val }
                                  : e,
                              ),
                            )
                          }
                          placeholder="Exercise notes (e.g. Pause 1s)"
                          placeholderTextColor={colors.textSecondary}
                          style={[
                            styles.exNotesInput,
                            {
                              backgroundColor: colors.background,
                              borderColor: colors.border,
                              color: colors.textPrimary,
                              borderRadius: Layout.radius.sm,
                            },
                          ]}
                        />
                      </View>

                      {/* Sets Table Header */}
                      <View style={styles.setHeaderRow}>
                        <Text
                          style={[
                            styles.setColType,
                            styles.setHeaderText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          SET
                        </Text>
                        <Text
                          style={[
                            styles.setColInput,
                            styles.setHeaderText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {unitLabel.toUpperCase()}
                        </Text>
                        <Text
                          style={[
                            styles.setColInput,
                            styles.setHeaderText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          REPS
                        </Text>
                        <Text
                          style={[
                            styles.setColInput,
                            styles.setHeaderText,
                            { color: colors.textSecondary },
                          ]}
                        >
                          RPE
                        </Text>
                        <View style={styles.setColDel} />
                      </View>

                      {/* Set Rows */}
                      {item.sets.map((s, setIdx) => {
                        const badge = SetTypeBadgeColors[s.set_type];
                        const badgeText =
                          s.set_type === 'normal'
                            ? String(setIdx + 1)
                            : badge.label;
                        const badgeColor =
                          s.set_type === 'normal'
                            ? colors.textPrimary
                            : badge.text;

                        return (
                          <View key={s.localKey} style={styles.setRow}>
                            <Pressable
                              onPress={() =>
                                handleUpdateSet(item.localKey, s.localKey, {
                                  set_type: nextSetType(s.set_type),
                                })
                              }
                              style={[
                                styles.setColType,
                                styles.setBadge,
                                {
                                  backgroundColor:
                                    s.set_type === 'normal'
                                      ? colors.background
                                      : badge.bg,
                                  borderRadius: Layout.radius.sm,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.setBadgeText,
                                  { color: badgeColor },
                                ]}
                              >
                                {badgeText}
                              </Text>
                            </Pressable>

                            <TextInput
                              value={s.weight}
                              onChangeText={(val) =>
                                handleUpdateSet(item.localKey, s.localKey, {
                                  weight: val,
                                })
                              }
                              keyboardType="decimal-pad"
                              placeholder="—"
                              placeholderTextColor={colors.textSecondary}
                              style={[
                                styles.setColInput,
                                styles.setInput,
                                {
                                  backgroundColor: colors.background,
                                  borderColor: colors.border,
                                  color: colors.textPrimary,
                                  borderRadius: Layout.radius.sm,
                                },
                              ]}
                            />

                            <TextInput
                              value={s.reps}
                              onChangeText={(val) =>
                                handleUpdateSet(item.localKey, s.localKey, {
                                  reps: val,
                                })
                              }
                              keyboardType="number-pad"
                              placeholder="—"
                              placeholderTextColor={colors.textSecondary}
                              style={[
                                styles.setColInput,
                                styles.setInput,
                                {
                                  backgroundColor: colors.background,
                                  borderColor: colors.border,
                                  color: colors.textPrimary,
                                  borderRadius: Layout.radius.sm,
                                },
                              ]}
                            />

                            <TextInput
                              value={s.rpe}
                              onChangeText={(val) =>
                                handleUpdateSet(item.localKey, s.localKey, {
                                  rpe: val,
                                })
                              }
                              keyboardType="decimal-pad"
                              placeholder="—"
                              placeholderTextColor={colors.textSecondary}
                              style={[
                                styles.setColInput,
                                styles.setInput,
                                {
                                  backgroundColor: colors.background,
                                  borderColor: colors.border,
                                  color: colors.textPrimary,
                                  borderRadius: Layout.radius.sm,
                                },
                              ]}
                            />

                            <Pressable
                              onPress={() =>
                                handleRemoveSet(item.localKey, s.localKey)
                              }
                              style={styles.setColDel}
                              hitSlop={6}
                            >
                              <X size={16} color={colors.textSecondary} />
                            </Pressable>
                          </View>
                        );
                      })}

                      <Pressable
                        onPress={() => handleAddSet(item.localKey)}
                        style={[
                          styles.addSetBtn,
                          {
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                            borderRadius: Layout.radius.md,
                          },
                        ]}
                      >
                        <Plus size={14} color={colors.primary} />
                        <Text
                          style={[
                            styles.addSetText,
                            { color: colors.primary },
                          ]}
                        >
                          Add Set
                        </Text>
                      </Pressable>
                    </View>
                  );
                })
              )}

              {!isDesktop ? (
                <Pressable
                  onPress={() => setPickerModalVisible(true)}
                  style={[
                    styles.addExerciseBtn,
                    {
                      backgroundColor: `${colors.primary}1A`,
                      borderColor: colors.primary,
                      borderRadius: Layout.radius.md,
                    },
                  ]}
                >
                  <Plus size={18} color={colors.primary} />
                  <Text
                    style={[styles.addExerciseText, { color: colors.primary }]}
                  >
                    Add Exercise
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </ScrollView>

          {/* Desktop Split-Pane Right Exercise Picker */}
          {isDesktop ? (
            <View
              style={[
                styles.desktopPickerPane,
                { borderLeftColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.pickerPaneHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <Text
                  style={[styles.pickerPaneTitle, { color: colors.textPrimary }]}
                >
                  Add Exercises
                </Text>
              </View>
              <ExercisePicker
                exercises={pickerExercises}
                searchQuery={searchQuery}
                onChangeSearchQuery={setSearchQuery}
                selectedMuscle={selectedMuscle}
                onChangeMuscle={setSelectedMuscle}
                selectedEquipment={selectedEquipment}
                onChangeEquipment={setSelectedEquipment}
                onSelectExercise={handleAddExercise}
                onPressCreateCustom={() => setCustomModalVisible(true)}
                actionLabel="+ Add"
              />
            </View>
          ) : null}
        </View>
      )}

      {/* Mobile Exercise Picker Modal */}
      <Modal
        visible={pickerModalVisible}
        animationType="slide"
        onRequestClose={() => setPickerModalVisible(false)}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background, paddingTop: insets.top },
          ]}
        >
          <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
            <Text style={[styles.topBarTitle, { color: colors.textPrimary }]}>
              Add Exercise
            </Text>
            <Pressable
              onPress={() => setPickerModalVisible(false)}
              hitSlop={8}
            >
              <X size={22} color={colors.textPrimary} />
            </Pressable>
          </View>
          <ExercisePicker
            exercises={pickerExercises}
            searchQuery={searchQuery}
            onChangeSearchQuery={setSearchQuery}
            selectedMuscle={selectedMuscle}
            onChangeMuscle={setSelectedMuscle}
            selectedEquipment={selectedEquipment}
            onChangeEquipment={setSelectedEquipment}
            onSelectExercise={handleAddExercise}
            onPressCreateCustom={() => setCustomModalVisible(true)}
            actionLabel="+ Add"
          />
        </View>
      </Modal>

      <CustomExerciseModal
        visible={customModalVisible}
        onClose={() => setCustomModalVisible(false)}
        onSave={handleCreateCustomExercise}
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  topBarTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  saveBtn: {
    paddingHorizontal: Spacing.lg,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workspace: {
    flex: 1,
  },
  editorScroll: {
    flex: 1,
  },
  editorContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.xxxxl,
  },
  errorBox: {
    borderWidth: 1,
    padding: Spacing.md,
  },
  errorText: {
    fontSize: FontSize.sm,
  },
  fieldGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 44,
    fontSize: FontSize.base,
  },
  notesInput: {
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 60,
    fontSize: FontSize.sm,
  },
  folderChips: {
    gap: Spacing.xs,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
  },
  chipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  exercisesSection: {
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  emptyExercises: {
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyExText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  exerciseCard: {
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  exHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  exTitleWrap: {
    flex: 1,
    gap: 2,
  },
  exTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
  },
  exMeta: {
    fontSize: FontSize.xs,
  },
  exActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  smallIconBtn: {
    width: 30,
    height: 30,
    borderWidth: 1,
    borderRadius: Layout.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exConfigRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  restField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  configLabel: {
    fontSize: FontSize.xs,
  },
  restInput: {
    borderWidth: 1,
    width: 56,
    height: 34,
    textAlign: 'center',
    fontSize: FontSize.sm,
  },
  exNotesInput: {
    flex: 1,
    borderWidth: 1,
    height: 34,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSize.xs,
  },
  setHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  setHeaderText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  setColType: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setBadge: {
    height: 36,
  },
  setBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  setColInput: {
    flex: 1,
  },
  setInput: {
    borderWidth: 1,
    height: 36,
    textAlign: 'center',
    fontSize: FontSize.sm,
  },
  setColDel: {
    width: 32,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    height: 36,
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  addSetText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    height: 46,
    gap: Spacing.xs,
  },
  addExerciseText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  desktopPickerPane: {
    width: 400,
    borderLeftWidth: 1,
  },
  pickerPaneHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  pickerPaneTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
  },
  modalContainer: {
    flex: 1,
  },
});
