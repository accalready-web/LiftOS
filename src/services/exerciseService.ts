import { localDb } from '@/lib/storage';
import { generateUuid } from '@/utils/uuid';
import type {
  EquipmentType,
  Exercise,
  MuscleGroup,
  WeightUnit,
  WorkoutSet,
} from '@/types/database';

// ─── Types ──────────────────────────────────────────────────────

export interface ExerciseFilter {
  search?: string;
  muscle?: MuscleGroup | 'all';
  equipment?: EquipmentType | 'all';
  customOnly?: boolean;
}

export interface CustomExerciseInput {
  name: string;
  primary_muscle: MuscleGroup;
  secondary_muscles: MuscleGroup[];
  equipment: EquipmentType;
  instructions: string[];
  preferred_weight_unit: WeightUnit | null;
}

export interface ExerciseHistoryEntry {
  workoutId: string;
  workoutName: string;
  startedAt: string;
  weightUnit: WeightUnit;
  sets: WorkoutSet[];
}

// ─── Queries ────────────────────────────────────────────────────

export async function listExercises(
  filter: ExerciseFilter = {},
): Promise<Exercise[]> {
  const all = await localDb.getExercises();
  const query = filter.search?.trim().toLowerCase() ?? '';

  return all
    .filter((ex) => {
      if (filter.customOnly && !ex.is_custom) return false;
      if (filter.muscle && filter.muscle !== 'all' && ex.primary_muscle !== filter.muscle) {
        return false;
      }
      if (
        filter.equipment &&
        filter.equipment !== 'all' &&
        ex.equipment !== filter.equipment
      ) {
        return false;
      }
      if (query.length > 0) {
        const haystack = `${ex.name} ${ex.primary_muscle} ${ex.equipment}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getExerciseById(id: string): Promise<Exercise | null> {
  const exercise = await localDb.getExerciseById(id);
  if (!exercise || exercise.deleted_at !== null) {
    return null;
  }
  return exercise;
}

export async function getExerciseHistory(
  userId: string,
  exerciseId: string,
): Promise<ExerciseHistoryEntry[]> {
  const workouts = await localDb.getWorkouts(userId);
  const entries: ExerciseHistoryEntry[] = [];

  for (const workout of workouts) {
    const workoutExercises = await localDb.getWorkoutExercises(workout.id);
    const matching = workoutExercises.filter((we) => we.exercise_id === exerciseId);

    for (const we of matching) {
      const sets = await localDb.getWorkoutSets(we.id);
      if (sets.length === 0) continue;

      entries.push({
        workoutId: workout.id,
        workoutName: workout.name,
        startedAt: workout.started_at,
        weightUnit: we.weight_unit,
        sets,
      });
    }
  }

  return entries.sort(
    (a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt),
  );
}

// ─── Mutations ──────────────────────────────────────────────────

export async function createCustomExercise(
  userId: string,
  input: CustomExerciseInput,
): Promise<Exercise> {
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    throw new Error('Exercise name is required');
  }

  const now = new Date().toISOString();
  const exercise: Exercise = {
    id: generateUuid(),
    user_id: userId,
    name: trimmedName,
    primary_muscle: input.primary_muscle,
    secondary_muscles: input.secondary_muscles.filter(
      (m) => m !== input.primary_muscle,
    ),
    equipment: input.equipment,
    instructions: input.instructions.map((s) => s.trim()).filter(Boolean),
    media_url: null,
    is_custom: true,
    preferred_weight_unit: input.preferred_weight_unit,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sync_status: 'pending',
  };

  await localDb.upsertExercise(exercise);
  return exercise;
}

export async function updateCustomExercise(
  id: string,
  input: CustomExerciseInput,
): Promise<Exercise> {
  const existing = await localDb.getExerciseById(id);
  if (!existing || existing.deleted_at !== null) {
    throw new Error('Exercise not found');
  }
  if (!existing.is_custom) {
    throw new Error('System exercises cannot be edited');
  }

  const trimmedName = input.name.trim();
  if (!trimmedName) {
    throw new Error('Exercise name is required');
  }

  const updated: Exercise = {
    ...existing,
    name: trimmedName,
    primary_muscle: input.primary_muscle,
    secondary_muscles: input.secondary_muscles.filter(
      (m) => m !== input.primary_muscle,
    ),
    equipment: input.equipment,
    instructions: input.instructions.map((s) => s.trim()).filter(Boolean),
    preferred_weight_unit: input.preferred_weight_unit,
    updated_at: new Date().toISOString(),
    sync_status: 'pending',
  };

  await localDb.upsertExercise(updated);
  return updated;
}

export async function setExercisePreferredWeightUnit(
  id: string,
  unit: WeightUnit | null,
): Promise<Exercise> {
  const existing = await localDb.getExerciseById(id);
  if (!existing || existing.deleted_at !== null) {
    throw new Error('Exercise not found');
  }

  const updated: Exercise = {
    ...existing,
    preferred_weight_unit: unit,
    updated_at: new Date().toISOString(),
    // System exercises (user_id === null) stay local-only for unit preference
    sync_status: existing.is_custom ? 'pending' : 'synced',
  };

  await localDb.upsertExercise(updated);
  return updated;
}

export async function deleteCustomExercise(id: string): Promise<void> {
  const existing = await localDb.getExerciseById(id);
  if (!existing || existing.deleted_at !== null) {
    return;
  }
  if (!existing.is_custom) {
    throw new Error('System exercises cannot be deleted');
  }

  await localDb.softDeleteExercise(id, new Date().toISOString());
}
