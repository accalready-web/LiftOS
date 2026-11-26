import type { SetType } from '@/constants/theme';
import type { WeightUnit } from './settings';

export type { SetType, WeightUnit };

// ─── Enums & Union Types ────────────────────────────────────────

export type SyncStatus = 'pending' | 'synced' | 'error';

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'quads'
  | 'hamstrings'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'core'
  | 'calves'
  | 'glutes'
  | 'forearms'
  | 'full_body'
  | 'cardio'
  | 'other';

export type EquipmentType =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'bodyweight'
  | 'kettlebell'
  | 'bands'
  | 'other';

export type SyncableTableName =
  | 'routine_folders'
  | 'exercises'
  | 'routines'
  | 'routine_exercises'
  | 'routine_sets'
  | 'workouts'
  | 'workout_exercises'
  | 'workout_sets'
  | 'user_settings';

// ─── Base Syncable Record ───────────────────────────────────────

export interface SyncMetadataFields {
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_status?: SyncStatus;
}

// ─── Core Entities (Matching Supabase PostgreSQL & Local DB) ─────

export interface Exercise extends SyncMetadataFields {
  id: string;
  user_id: string | null;
  name: string;
  primary_muscle: MuscleGroup;
  secondary_muscles: MuscleGroup[];
  equipment: EquipmentType;
  instructions: string[];
  media_url: string | null;
  is_custom: boolean;
  preferred_weight_unit: WeightUnit | null;
}

export interface RoutineFolder extends SyncMetadataFields {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
}

export interface Routine extends SyncMetadataFields {
  id: string;
  user_id: string;
  folder_id: string | null;
  name: string;
  notes: string | null;
  sort_order: number;
}

export interface RoutineExercise extends SyncMetadataFields {
  id: string;
  user_id: string;
  routine_id: string;
  exercise_id: string;
  sort_order: number;
  rest_seconds: number | null;
  notes: string | null;
}

export interface RoutineSet extends SyncMetadataFields {
  id: string;
  user_id: string;
  routine_exercise_id: string;
  set_number: number;
  set_type: SetType;
  target_weight: number | null;
  target_reps: number | null;
  target_reps_max: number | null;
  target_rpe: number | null;
}

export interface Workout extends SyncMetadataFields {
  id: string;
  user_id: string;
  routine_id: string | null;
  name: string;
  notes: string | null;
  started_at: string;
  finished_at: string;
  duration_seconds: number;
  total_volume_kg: number;
  total_sets: number;
}

export interface WorkoutExercise extends SyncMetadataFields {
  id: string;
  user_id: string;
  workout_id: string;
  exercise_id: string;
  sort_order: number;
  weight_unit: WeightUnit;
  rest_seconds: number | null;
  notes: string | null;
}

export interface WorkoutSet extends SyncMetadataFields {
  id: string;
  user_id: string;
  workout_exercise_id: string;
  set_number: number;
  set_type: SetType;
  weight: number;
  reps: number;
  rpe: number | null;
  is_completed: boolean;
  completed_at: string | null;
}

// ─── Local-Only Metadata Types ──────────────────────────────────

export interface ActiveWorkoutDraftSet {
  id: string;
  set_number: number;
  set_type: SetType;
  weight: string;
  reps: string;
  rpe: string;
  is_completed: boolean;
  completed_at: string | null;
}

export interface ActiveWorkoutDraftExercise {
  id: string;
  exercise_id: string;
  exercise_name: string;
  primary_muscle: MuscleGroup;
  equipment: EquipmentType;
  sort_order: number;
  weight_unit: WeightUnit;
  rest_seconds: number | null;
  notes: string | null;
  sets: ActiveWorkoutDraftSet[];
}

export interface ActiveWorkoutDraft {
  id: string;
  routine_id: string | null;
  name: string;
  notes: string;
  started_at: string;
  exercises: ActiveWorkoutDraftExercise[];
  rest_timer_end_at: number | null;
  rest_timer_total_seconds: number | null;
  scheduled_notification_id: string | null;
  updated_at: string;
}

export interface PreviousSetPerformance {
  set_number: number;
  weight: number;
  reps: number;
  weight_unit: WeightUnit;
  rpe: number | null;
}
