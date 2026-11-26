import type {
  ActiveWorkoutDraft,
  Exercise,
  PreviousSetPerformance,
  Routine,
  RoutineExercise,
  RoutineFolder,
  RoutineSet,
  SyncableTableName,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from '@/types/database';
import type { UserSettings } from '@/types/settings';

export const LOCAL_USER_ID = 'local-user';

export interface LocalDatabase {
  /** Initialize DB, run migrations, and prepare object stores/tables */
  init(): Promise<void>;

  // ─── Sync Metadata & Outbox ─────────────────────────────────────
  getLastSyncedAt(): Promise<string | null>;
  setLastSyncedAt(isoTimestamp: string): Promise<void>;
  getPendingRecords<T>(table: SyncableTableName): Promise<T[]>;
  markRecordsSynced(table: SyncableTableName, ids: string[]): Promise<void>;
  upsertSyncedRecords<T extends Record<string, unknown>>(
    table: SyncableTableName,
    records: T[],
  ): Promise<void>;
  reassignLocalUser(fromUserId: string, toUserId: string): Promise<void>;

  // ─── Exercises ──────────────────────────────────────────────────
  getExercises(options?: { includeDeleted?: boolean }): Promise<Exercise[]>;
  getExerciseById(id: string): Promise<Exercise | null>;
  upsertExercise(exercise: Exercise): Promise<void>;
  upsertExercisesBatch(exercises: Exercise[]): Promise<void>;
  softDeleteExercise(id: string, deletedAt: string): Promise<void>;

  // ─── Routine Folders ────────────────────────────────────────────
  getRoutineFolders(userId: string): Promise<RoutineFolder[]>;
  upsertRoutineFolder(folder: RoutineFolder): Promise<void>;
  softDeleteRoutineFolder(id: string, deletedAt: string): Promise<void>;

  // ─── Routines ───────────────────────────────────────────────────
  getRoutines(userId: string): Promise<Routine[]>;
  getRoutineById(id: string): Promise<Routine | null>;
  upsertRoutine(routine: Routine): Promise<void>;
  softDeleteRoutine(id: string, deletedAt: string): Promise<void>;

  // ─── Routine Exercises & Sets ───────────────────────────────────
  getRoutineExercises(routineId: string): Promise<RoutineExercise[]>;
  upsertRoutineExercise(item: RoutineExercise): Promise<void>;
  softDeleteRoutineExercise(id: string, deletedAt: string): Promise<void>;
  getRoutineSets(routineExerciseId: string): Promise<RoutineSet[]>;
  upsertRoutineSet(item: RoutineSet): Promise<void>;
  softDeleteRoutineSet(id: string, deletedAt: string): Promise<void>;

  // ─── Workouts ───────────────────────────────────────────────────
  getWorkouts(userId: string): Promise<Workout[]>;
  getWorkoutById(id: string): Promise<Workout | null>;
  upsertWorkout(workout: Workout): Promise<void>;
  softDeleteWorkout(id: string, deletedAt: string): Promise<void>;

  // ─── Workout Exercises & Sets ───────────────────────────────────
  getWorkoutExercises(workoutId: string): Promise<WorkoutExercise[]>;
  upsertWorkoutExercise(item: WorkoutExercise): Promise<void>;
  softDeleteWorkoutExercise(id: string, deletedAt: string): Promise<void>;
  getWorkoutSets(workoutExerciseId: string): Promise<WorkoutSet[]>;
  upsertWorkoutSet(item: WorkoutSet): Promise<void>;
  softDeleteWorkoutSet(id: string, deletedAt: string): Promise<void>;

  // ─── Previous Value Lookup ──────────────────────────────────────
  getPreviousExercisePerformance(
    userId: string,
    exerciseId: string,
  ): Promise<PreviousSetPerformance[]>;

  // ─── Active Workout Draft ───────────────────────────────────────
  getActiveWorkoutDraft(): Promise<ActiveWorkoutDraft | null>;
  saveActiveWorkoutDraft(draft: ActiveWorkoutDraft): Promise<void>;
  clearActiveWorkoutDraft(): Promise<void>;

  // ─── User Settings ──────────────────────────────────────────────
  getUserSettings(userId: string): Promise<UserSettings | null>;
  upsertUserSettings(settings: UserSettings): Promise<void>;
}
