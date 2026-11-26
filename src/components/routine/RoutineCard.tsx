import React from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Copy, Pencil, Play, Trash2 } from 'lucide-react-native';

import {
  FontSize,
  FontWeight,
  getColors,
  Layout,
  Spacing,
} from '@/constants/theme';
import type { RoutineSummary } from '@/services/routineService';
import { useSettingsStore } from '@/stores/useSettingsStore';

interface RoutineCardProps {
  routine: RoutineSummary;
  folderName?: string | null;
  onStart: (routine: RoutineSummary) => void;
  onEdit: (routine: RoutineSummary) => void;
  onDuplicate: (routine: RoutineSummary) => void;
  onDelete: (routine: RoutineSummary) => void;
}

export function RoutineCard({
  routine,
  folderName,
  onStart,
  onEdit,
  onDuplicate,
  onDelete,
}: RoutineCardProps) {
  const theme = useSettingsStore((s) => s.theme);
  const colors = getColors(theme);

  const previewText =
    routine.exercisePreview.length > 0
      ? routine.exercisePreview.slice(0, 4).join(', ') +
        (routine.exercisePreview.length > 4
          ? ` +${routine.exercisePreview.length - 4} more`
          : '')
      : 'No exercises yet';

  const confirmDelete = () => {
    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm(`Delete routine "${routine.name}"?`)
      ) {
        onDelete(routine);
      }
      return;
    }

    Alert.alert(
      'Delete Routine',
      `Are you sure you want to delete "${routine.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(routine),
        },
      ],
    );
  };

  return (
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
      <View style={styles.topRow}>
        <View style={styles.titleBlock}>
          <Text
            style={[styles.title, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {routine.name}
          </Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            {routine.exerciseCount} exercises · {routine.totalSets} sets
            {folderName ? ` · ${folderName}` : ''}
          </Text>
        </View>

        <View style={styles.iconActions}>
          <Pressable
            onPress={() => onEdit(routine)}
            hitSlop={6}
            style={[
              styles.iconBtn,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
            accessibilityLabel="Edit routine"
          >
            <Pencil size={15} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => onDuplicate(routine)}
            hitSlop={6}
            style={[
              styles.iconBtn,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
            accessibilityLabel="Duplicate routine"
          >
            <Copy size={15} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={confirmDelete}
            hitSlop={6}
            style={[
              styles.iconBtn,
              { backgroundColor: colors.dangerMuted, borderColor: colors.danger },
            ]}
            accessibilityLabel="Delete routine"
          >
            <Trash2 size={15} color={colors.danger} />
          </Pressable>
        </View>
      </View>

      <Text
        style={[styles.preview, { color: colors.textSecondary }]}
        numberOfLines={2}
      >
        {previewText}
      </Text>

      <Pressable
        onPress={() => onStart(routine)}
        style={[
          styles.startBtn,
          {
            backgroundColor: colors.primary,
            borderRadius: Layout.radius.md,
          },
        ]}
      >
        <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
        <Text style={styles.startBtnText}>Start Routine</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  meta: {
    fontSize: FontSize.xs,
  },
  iconActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: Layout.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    minHeight: 40,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    gap: Spacing.sm,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
});
