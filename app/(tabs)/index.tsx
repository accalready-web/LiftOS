import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  FolderPlus,
  Pencil,
  Play,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FolderModal } from '@/components/routine/FolderModal';
import { RoutineCard } from '@/components/routine/RoutineCard';
import {
  FontSize,
  FontWeight,
  getColors,
  Layout,
  Spacing,
} from '@/constants/theme';
import {
  createRoutineFolder,
  deleteRoutine,
  deleteRoutineFolder,
  duplicateRoutine,
  listRoutineFolders,
  listRoutinesWithSummary,
  renameRoutineFolder,
  type RoutineSummary,
} from '@/services/routineService';
import { useAuthStore } from '@/stores/useAuthStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import type { RoutineFolder } from '@/types/database';

type FolderFilter = 'all' | 'unfiled' | string;

export default function WorkoutHubScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= Layout.desktopBreakpoint;
  const isWideDesktop = width >= 1140;
  const insets = useSafeAreaInsets();

  const theme = useSettingsStore((s) => s.theme);
  const colors = getColors(theme);
  const getActiveUserId = useAuthStore((s) => s.getActiveUserId);

  const [folders, setFolders] = useState<RoutineFolder[]>([]);
  const [routines, setRoutines] = useState<RoutineSummary[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<FolderFilter>('all');
  const [isLoading, setIsLoading] = useState(true);

  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [editingFolder, setEditingFolder] = useState<RoutineFolder | null>(null);

  const loadData = useCallback(async () => {
    const userId = getActiveUserId();
    setIsLoading(true);
    try {
      const [loadedFolders, loadedRoutines] = await Promise.all([
        listRoutineFolders(userId),
        listRoutinesWithSummary(userId),
      ]);
      setFolders(loadedFolders);
      setRoutines(loadedRoutines);
    } finally {
      setIsLoading(false);
    }
  }, [getActiveUserId]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const folderNameMap = new Map(folders.map((f) => [f.id, f.name]));

  const filteredRoutines = routines.filter((r) => {
    if (selectedFolder === 'all') return true;
    if (selectedFolder === 'unfiled') return r.folder_id === null;
    return r.folder_id === selectedFolder;
  });

  const activeFolderObj =
    selectedFolder !== 'all' && selectedFolder !== 'unfiled'
      ? folders.find((f) => f.id === selectedFolder) ?? null
      : null;

  const notifyActiveWorkoutPending = (routineName?: string) => {
    const msg = routineName
      ? `Active Workout Logger for "${routineName}" will be wired in Step 2.3.`
      : 'Active Workout Logger will be wired in Step 2.3.';
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(msg);
    } else {
      Alert.alert('Coming in Step 2.3', msg);
    }
  };

  const handleSaveFolder = async (name: string) => {
    const userId = getActiveUserId();
    if (editingFolder) {
      await renameRoutineFolder(userId, editingFolder.id, name);
    } else {
      const created = await createRoutineFolder(userId, name);
      setSelectedFolder(created.id);
    }
    await loadData();
  };

  const handleDeleteFolder = (folder: RoutineFolder) => {
    const performDelete = async () => {
      await deleteRoutineFolder(getActiveUserId(), folder.id);
      setSelectedFolder('all');
      await loadData();
    };

    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm(
          `Delete folder "${folder.name}"? Routines inside will move to Unfiled.`,
        )
      ) {
        void performDelete();
      }
      return;
    }

    Alert.alert(
      'Delete Folder',
      `Delete "${folder.name}"? Routines inside will be kept as Unfiled.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void performDelete(),
        },
      ],
    );
  };

  const handleDuplicateRoutine = async (routine: RoutineSummary) => {
    await duplicateRoutine(getActiveUserId(), routine.id);
    await loadData();
  };

  const handleDeleteRoutine = async (routine: RoutineSummary) => {
    await deleteRoutine(routine.id);
    await loadData();
  };

  const cardWidthStyle = isWideDesktop
    ? styles.cardThird
    : isDesktop
      ? styles.cardHalf
      : styles.cardFull;

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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Workout
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Start a quick session or launch a planned routine
            </Text>
          </View>
        </View>

        {/* Quick Start Empty Workout */}
        <Pressable
          onPress={() => notifyActiveWorkoutPending()}
          style={[
            styles.emptyWorkoutBtn,
            {
              backgroundColor: colors.primary,
              borderRadius: Layout.radius.lg,
            },
          ]}
        >
          <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
          <Text style={styles.emptyWorkoutText}>Start Empty Workout</Text>
        </Pressable>

        {/* Routines Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Routines ({filteredRoutines.length})
          </Text>
          <View style={styles.sectionActions}>
            <Pressable
              onPress={() => {
                setEditingFolder(null);
                setFolderModalVisible(true);
              }}
              style={[
                styles.secondaryBtn,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: Layout.radius.md,
                },
              ]}
            >
              <FolderPlus size={16} color={colors.textPrimary} />
              <Text
                style={[styles.secondaryBtnText, { color: colors.textPrimary }]}
              >
                Folder
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                const folderParam =
                  activeFolderObj !== null
                    ? `?folderId=${activeFolderObj.id}`
                    : '';
                router.push(`/routine/new${folderParam}` as never);
              }}
              style={[
                styles.secondaryBtn,
                {
                  backgroundColor: `${colors.primary}1A`,
                  borderColor: colors.primary,
                  borderRadius: Layout.radius.md,
                },
              ]}
            >
              <Plus size={16} color={colors.primary} />
              <Text
                style={[styles.secondaryBtnText, { color: colors.primary }]}
              >
                New Routine
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Folder Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.folderChips}
        >
          <FolderChip
            label="All"
            active={selectedFolder === 'all'}
            onPress={() => setSelectedFolder('all')}
          />
          <FolderChip
            label="Unfiled"
            active={selectedFolder === 'unfiled'}
            onPress={() => setSelectedFolder('unfiled')}
          />
          {folders.map((folder) => (
            <FolderChip
              key={folder.id}
              label={folder.name}
              active={selectedFolder === folder.id}
              onPress={() => setSelectedFolder(folder.id)}
            />
          ))}
        </ScrollView>

        {/* Selected Folder Management Bar */}
        {activeFolderObj ? (
          <View
            style={[
              styles.folderBar,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: Layout.radius.md,
              },
            ]}
          >
            <Text style={[styles.folderBarName, { color: colors.textPrimary }]}>
              Folder: {activeFolderObj.name}
            </Text>
            <View style={styles.folderBarActions}>
              <Pressable
                onPress={() => {
                  setEditingFolder(activeFolderObj);
                  setFolderModalVisible(true);
                }}
                style={styles.folderBarBtn}
              >
                <Pencil size={14} color={colors.textSecondary} />
                <Text
                  style={[styles.folderBarBtnText, { color: colors.textSecondary }]}
                >
                  Rename
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleDeleteFolder(activeFolderObj)}
                style={styles.folderBarBtn}
              >
                <Trash2 size={14} color={colors.danger} />
                <Text style={[styles.folderBarBtnText, { color: colors.danger }]}>
                  Delete
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Routines Grid / List */}
        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : filteredRoutines.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: Layout.radius.lg,
              },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No routines here yet
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Create a routine to plan your exercises, target sets, reps, and
              rest timers.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredRoutines.map((routine) => (
              <View key={routine.id} style={cardWidthStyle}>
                <RoutineCard
                  routine={routine}
                  folderName={
                    routine.folder_id
                      ? folderNameMap.get(routine.folder_id) ?? null
                      : null
                  }
                  onStart={(r) => notifyActiveWorkoutPending(r.name)}
                  onEdit={(r) => router.push(`/routine/${r.id}` as never)}
                  onDuplicate={(r) => void handleDuplicateRoutine(r)}
                  onDelete={(r) => void handleDeleteRoutine(r)}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <FolderModal
        visible={folderModalVisible}
        initialName={editingFolder?.name ?? ''}
        title={editingFolder ? 'Rename Folder' : 'New Folder'}
        onClose={() => setFolderModalVisible(false)}
        onSave={handleSaveFolder}
      />
    </View>
  );
}

function FolderChip({
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
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  subtitle: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  emptyWorkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    gap: Spacing.sm,
  },
  emptyWorkoutText: {
    color: '#FFFFFF',
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  sectionActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    height: 36,
    gap: Spacing.xs,
  },
  secondaryBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
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
  folderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  folderBarName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  folderBarActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  folderBarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  folderBarBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  centerBox: {
    padding: Spacing.xxxl,
    alignItems: 'center',
  },
  emptyState: {
    borderWidth: 1,
    padding: Spacing.xxl,
    alignItems: 'center',
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  cardFull: {
    width: '100%',
  },
  cardHalf: {
    width: '48.8%',
  },
  cardThird: {
    width: '32.2%',
  },
});
