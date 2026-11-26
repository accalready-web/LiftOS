import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';

import { EQUIPMENT_TYPES, MUSCLE_GROUPS } from '@/constants/exercises';
import {
  FontSize,
  FontWeight,
  getColors,
  Layout,
  Spacing,
} from '@/constants/theme';
import type { CustomExerciseInput } from '@/services/exerciseService';
import { useSettingsStore } from '@/stores/useSettingsStore';
import type {
  EquipmentType,
  Exercise,
  MuscleGroup,
  WeightUnit,
} from '@/types/database';

interface CustomExerciseModalProps {
  visible: boolean;
  initialExercise?: Exercise | null;
  onClose: () => void;
  onSave: (input: CustomExerciseInput) => Promise<void>;
}

export function CustomExerciseModal({
  visible,
  initialExercise,
  onClose,
  onSave,
}: CustomExerciseModalProps) {
  const theme = useSettingsStore((s) => s.theme);
  const colors = getColors(theme);

  const [name, setName] = useState('');
  const [primaryMuscle, setPrimaryMuscle] = useState<MuscleGroup>('chest');
  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleGroup[]>([]);
  const [equipment, setEquipment] = useState<EquipmentType>('barbell');
  const [preferredUnit, setPreferredUnit] = useState<WeightUnit | null>(null);
  const [instructionsText, setInstructionsText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (initialExercise) {
      setName(initialExercise.name);
      setPrimaryMuscle(initialExercise.primary_muscle);
      setSecondaryMuscles(initialExercise.secondary_muscles);
      setEquipment(initialExercise.equipment);
      setPreferredUnit(initialExercise.preferred_weight_unit);
      setInstructionsText(initialExercise.instructions.join('\n'));
    } else {
      setName('');
      setPrimaryMuscle('chest');
      setSecondaryMuscles([]);
      setEquipment('barbell');
      setPreferredUnit(null);
      setInstructionsText('');
    }
    setError(null);
    setIsSaving(false);
  }, [visible, initialExercise]);

  const toggleSecondary = (muscle: MuscleGroup) => {
    if (muscle === primaryMuscle) return;
    setSecondaryMuscles((prev) =>
      prev.includes(muscle)
        ? prev.filter((m) => m !== muscle)
        : [...prev, muscle],
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Please enter an exercise name.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        primary_muscle: primaryMuscle,
        secondary_muscles: secondaryMuscles,
        equipment,
        instructions: instructionsText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        preferred_weight_unit: preferredUnit,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save exercise');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
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
          {/* Header */}
          <View
            style={[styles.header, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {initialExercise ? 'Edit Custom Exercise' : 'New Custom Exercise'}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Name */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Exercise Name *
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Cable Chest Fly"
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  borderRadius: Layout.radius.md,
                },
              ]}
            />

            {/* Primary Muscle */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Primary Muscle
            </Text>
            <View style={styles.chipGrid}>
              {MUSCLE_GROUPS.map((m) => {
                const active = primaryMuscle === m.value;
                return (
                  <Pressable
                    key={m.value}
                    onPress={() => {
                      setPrimaryMuscle(m.value);
                      setSecondaryMuscles((prev) =>
                        prev.filter((item) => item !== m.value),
                      );
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active
                          ? colors.primary
                          : colors.background,
                        borderColor: active ? colors.primary : colors.border,
                        borderRadius: Layout.radius.full,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? '#FFFFFF' : colors.textSecondary },
                      ]}
                    >
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Secondary Muscles */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Secondary Muscles (Optional)
            </Text>
            <View style={styles.chipGrid}>
              {MUSCLE_GROUPS.filter((m) => m.value !== primaryMuscle).map(
                (m) => {
                  const active = secondaryMuscles.includes(m.value);
                  return (
                    <Pressable
                      key={m.value}
                      onPress={() => toggleSecondary(m.value)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: active
                            ? `${colors.primary}22`
                            : colors.background,
                          borderColor: active ? colors.primary : colors.border,
                          borderRadius: Layout.radius.full,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: active
                              ? colors.primary
                              : colors.textSecondary,
                          },
                        ]}
                      >
                        {m.label}
                      </Text>
                    </Pressable>
                  );
                },
              )}
            </View>

            {/* Equipment */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Equipment
            </Text>
            <View style={styles.chipGrid}>
              {EQUIPMENT_TYPES.map((eq) => {
                const active = equipment === eq.value;
                return (
                  <Pressable
                    key={eq.value}
                    onPress={() => setEquipment(eq.value)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active
                          ? colors.primary
                          : colors.background,
                        borderColor: active ? colors.primary : colors.border,
                        borderRadius: Layout.radius.full,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: active ? '#FFFFFF' : colors.textSecondary },
                      ]}
                    >
                      {eq.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Preferred Weight Unit */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Preferred Weight Unit
            </Text>
            <View style={styles.segmentedRow}>
              {(
                [
                  { value: null, label: 'App Default' },
                  { value: 'kg', label: 'kg' },
                  { value: 'lbs', label: 'lbs' },
                ] as const
              ).map((opt) => {
                const active = preferredUnit === opt.value;
                return (
                  <Pressable
                    key={String(opt.value)}
                    onPress={() => setPreferredUnit(opt.value)}
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

            {/* Instructions */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Instructions (One step per line)
            </Text>
            <TextInput
              value={instructionsText}
              onChangeText={setInstructionsText}
              placeholder="Step 1...\nStep 2..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={[
                styles.textarea,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  borderRadius: Layout.radius.md,
                },
              ]}
            />

            {error ? (
              <Text style={[styles.errorText, { color: colors.danger }]}>
                {error}
              </Text>
            ) : null}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Pressable
              onPress={onClose}
              style={[
                styles.footerBtn,
                {
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: Layout.radius.md,
                },
              ]}
            >
              <Text
                style={[styles.footerBtnText, { color: colors.textPrimary }]}
              >
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={() => void handleSave()}
              disabled={isSaving}
              style={[
                styles.footerBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: Layout.radius.md,
                  opacity: isSaving ? 0.6 : 1,
                },
              ]}
            >
              <Text style={[styles.footerBtnText, { color: '#FFFFFF' }]}>
                {isSaving ? 'Saving...' : 'Save Exercise'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '90%',
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 44,
    fontSize: FontSize.base,
  },
  textarea: {
    borderWidth: 1,
    padding: Spacing.md,
    minHeight: 96,
    fontSize: FontSize.sm,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  segmentedRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
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
  errorText: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  footerBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
});
