import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Plus, Search, X } from 'lucide-react-native';

import {
  EQUIPMENT_TYPES,
  formatEquipmentLabel,
  formatMuscleLabel,
  MUSCLE_GROUPS,
} from '@/constants/exercises';
import {
  FontSize,
  FontWeight,
  getColors,
  Layout,
  Spacing,
} from '@/constants/theme';
import { useSettingsStore } from '@/stores/useSettingsStore';
import type { EquipmentType, Exercise, MuscleGroup } from '@/types/database';

export interface ExercisePickerProps {
  exercises: Exercise[];
  selectedExerciseId?: string | null;
  searchQuery: string;
  onChangeSearchQuery: (q: string) => void;
  selectedMuscle: MuscleGroup | 'all';
  onChangeMuscle: (m: MuscleGroup | 'all') => void;
  selectedEquipment: EquipmentType | 'all';
  onChangeEquipment: (e: EquipmentType | 'all') => void;
  onSelectExercise: (exercise: Exercise) => void;
  onPressCreateCustom?: () => void;
  isLoading?: boolean;
  actionLabel?: string;
}

export function ExercisePicker({
  exercises,
  selectedExerciseId,
  searchQuery,
  onChangeSearchQuery,
  selectedMuscle,
  onChangeMuscle,
  selectedEquipment,
  onChangeEquipment,
  onSelectExercise,
  onPressCreateCustom,
  isLoading = false,
  actionLabel,
}: ExercisePickerProps) {
  const theme = useSettingsStore((s) => s.theme);
  const colors = getColors(theme);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search + Create Custom */}
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: Layout.radius.md,
            },
          ]}
        >
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            value={searchQuery}
            onChangeText={onChangeSearchQuery}
            placeholder="Search exercises..."
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 ? (
            <Pressable
              onPress={() => onChangeSearchQuery('')}
              hitSlop={8}
              accessibilityLabel="Clear search"
            >
              <X size={16} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        {onPressCreateCustom ? (
          <Pressable
            onPress={onPressCreateCustom}
            style={[
              styles.createButton,
              {
                backgroundColor: colors.primary,
                borderRadius: Layout.radius.md,
              },
            ]}
          >
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Custom</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Muscle Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipContainer}
      >
        <FilterChip
          label="All Muscles"
          active={selectedMuscle === 'all'}
          onPress={() => onChangeMuscle('all')}
        />
        {MUSCLE_GROUPS.map((m) => (
          <FilterChip
            key={m.value}
            label={m.label}
            active={selectedMuscle === m.value}
            onPress={() =>
              onChangeMuscle(selectedMuscle === m.value ? 'all' : m.value)
            }
          />
        ))}
      </ScrollView>

      {/* Equipment Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipContainer}
      >
        <FilterChip
          label="All Equipment"
          active={selectedEquipment === 'all'}
          onPress={() => onChangeEquipment('all')}
        />
        {EQUIPMENT_TYPES.map((eq) => (
          <FilterChip
            key={eq.value}
            label={eq.label}
            active={selectedEquipment === eq.value}
            onPress={() =>
              onChangeEquipment(selectedEquipment === eq.value ? 'all' : eq.value)
            }
          />
        ))}
      </ScrollView>

      {/* Exercise List */}
      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No exercises found
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                Try another search or filter, or create a custom exercise.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isSelected = selectedExerciseId === item.id;
            return (
              <Pressable
                onPress={() => onSelectExercise(item)}
                style={[
                  styles.row,
                  {
                    backgroundColor: isSelected
                      ? `${colors.primary}18`
                      : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderRadius: Layout.radius.md,
                  },
                ]}
              >
                <View style={styles.rowMain}>
                  <View style={styles.titleRow}>
                    <Text
                      style={[styles.rowTitle, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {item.is_custom ? (
                      <View
                        style={[
                          styles.customBadge,
                          { backgroundColor: `${colors.primary}22` },
                        ]}
                      >
                        <Text
                          style={[
                            styles.customBadgeText,
                            { color: colors.primary },
                          ]}
                        >
                          Custom
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text
                    style={[styles.rowMeta, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    {formatMuscleLabel(item.primary_muscle)} ·{' '}
                    {formatEquipmentLabel(item.equipment)}
                    {item.preferred_weight_unit
                      ? ` · ${item.preferred_weight_unit}`
                      : ''}
                  </Text>
                </View>

                {actionLabel ? (
                  <View
                    style={[
                      styles.actionPill,
                      { backgroundColor: `${colors.primary}1A` },
                    ]}
                  >
                    <Text
                      style={[styles.actionPillText, { color: colors.primary }]}
                    >
                      {actionLabel}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useSettingsStore((s) => s.theme);
  const colors = getColors(theme);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.primary : colors.surface,
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
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 44,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.base,
    height: '100%',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  chipScroll: {
    flexGrow: 0,
  },
  chipContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
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
  listContent: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    padding: Spacing.md,
    minHeight: Layout.minTouchTarget + 12,
    gap: Spacing.md,
  },
  rowMain: {
    flex: 1,
    gap: Spacing.xxs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rowTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    flexShrink: 1,
  },
  customBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Layout.radius.sm,
  },
  customBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  rowMeta: {
    fontSize: FontSize.xs,
  },
  actionPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Layout.radius.sm,
  },
  actionPillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxxl,
    gap: Spacing.xs,
  },
  emptyTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  emptySub: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});
