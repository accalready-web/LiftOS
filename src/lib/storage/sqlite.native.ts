import * as SQLite from 'expo-sqlite';
import { runSqliteMigrations } from './migrations';
import type { LocalDatabase } from './interface';
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

// ─── Row Mapping Helpers ────────────────────────────────────────

interface RawExerciseRow extends Omit<Exercise, 'secondary_muscles' | 'instructions' | 'is_custom'> {
  secondary_muscles: string;
  instructions: string;
  is_custom: number;
}

interface RawWorkoutSetRow extends Omit<WorkoutSet, 'is_completed'> {
  is_completed: number;
}

interface RawUserSettingsRow
  extends Omit<UserSettings, 'available_plates_kg' | 'available_plates_lbs'> {
  available_plates_kg: string;
  available_plates_lbs: string;
}

function parseJsonArray<T>(raw: string | T[], fallback: T[]): T[] {
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function mapExerciseRow(row: RawExerciseRow): Exercise {
  return {
    ...row,
    secondary_muscles: parseJsonArray(row.secondary_muscles, []),
    instructions: parseJsonArray(row.instructions, []),
    is_custom: Boolean(row.is_custom),
  };
}

function mapWorkoutSetRow(row: RawWorkoutSetRow): WorkoutSet {
  return {
    ...row,
    is_completed: Boolean(row.is_completed),
  };
}

function mapUserSettingsRow(row: RawUserSettingsRow): UserSettings {
  return {
    ...row,
    available_plates_kg: parseJsonArray(
      row.available_plates_kg,
      [25, 20, 15, 10, 5, 2.5, 1.25],
    ),
    available_plates_lbs: parseJsonArray(
      row.available_plates_lbs,
      [45, 35, 25, 10, 5, 2.5],
    ),
  };
}

// ─── SQLite Implementation ──────────────────────────────────────

class SqliteLocalDatabase implements LocalDatabase {
  private db: SQLite.SQLiteDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const database = await SQLite.openDatabaseAsync('liftos.db');
      await database.execAsync('PRAGMA journal_mode = WAL;');
      await runSqliteMigrations(database);
      this.db = database;
    })();

    return this.initPromise;
  }

  private async getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  // ─── Sync Metadata & Outbox ─────────────────────────────────────

  async getLastSyncedAt(): Promise<string | null> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM sync_metadata WHERE key = ?;',
      ['last_synced_at'],
    );
    return row?.value ?? null;
  }

  async setLastSyncedAt(isoTimestamp: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      'INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?);',
      ['last_synced_at', isoTimestamp],
    );
  }

  async getPendingRecords<T>(table: SyncableTableName): Promise<T[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM ${table} WHERE sync_status = 'pending';`,
    );

    if (table === 'exercises') {
      return rows.map((r) =>
        mapExerciseRow(r as unknown as RawExerciseRow),
      ) as unknown as T[];
    }
    if (table === 'workout_sets') {
      return rows.map((r) =>
        mapWorkoutSetRow(r as unknown as RawWorkoutSetRow),
      ) as unknown as T[];
    }
    if (table === 'user_settings') {
      return rows.map((r) =>
        mapUserSettingsRow(r as unknown as RawUserSettingsRow),
      ) as unknown as T[];
    }
    return rows as unknown as T[];
  }

  async markRecordsSynced(
    table: SyncableTableName,
    ids: string[],
  ): Promise<void> {
    if (ids.length === 0) return;
    const db = await this.getDb();
    const pkCol = table === 'user_settings' ? 'user_id' : 'id';
    const placeholders = ids.map(() => '?').join(', ');
    await db.runAsync(
      `UPDATE ${table} SET sync_status = 'synced' WHERE ${pkCol} IN (${placeholders});`,
      ids,
    );
  }

  async upsertSyncedRecords<T extends Record<string, unknown>>(
    table: SyncableTableName,
    records: T[],
  ): Promise<void> {
    if (records.length === 0) return;
    const db = await this.getDb();

    await db.withTransactionAsync(async () => {
      for (const record of records) {
        const normalized = { ...record, sync_status: 'synced' };
        if (table === 'exercises') {
          await this.upsertExerciseInternal(
            db,
            normalized as unknown as Exercise,
          );
        } else if (table === 'routine_folders') {
          await this.upsertRoutineFolderInternal(
            db,
            normalized as unknown as RoutineFolder,
          );
        } else if (table === 'routines') {
          await this.upsertRoutineInternal(
            db,
            normalized as unknown as Routine,
          );
        } else if (table === 'routine_exercises') {
          await this.upsertRoutineExerciseInternal(
            db,
            normalized as unknown as RoutineExercise,
          );
        } else if (table === 'routine_sets') {
          await this.upsertRoutineSetInternal(
            db,
            normalized as unknown as RoutineSet,
          );
        } else if (table === 'workouts') {
          await this.upsertWorkoutInternal(
            db,
            normalized as unknown as Workout,
          );
        } else if (table === 'workout_exercises') {
          await this.upsertWorkoutExerciseInternal(
            db,
            normalized as unknown as WorkoutExercise,
          );
        } else if (table === 'workout_sets') {
          await this.upsertWorkoutSetInternal(
            db,
            normalized as unknown as WorkoutSet,
          );
        } else if (table === 'user_settings') {
          await this.upsertUserSettingsInternal(
            db,
            normalized as unknown as UserSettings,
          );
        }
      }
    });
  }

  async reassignLocalUser(fromUserId: string, toUserId: string): Promise<void> {
    if (fromUserId === toUserId) return;
    const db = await this.getDb();
    const tablesWithUserId: SyncableTableName[] = [
      'exercises',
      'routine_folders',
      'routines',
      'routine_exercises',
      'routine_sets',
      'workouts',
      'workout_exercises',
      'workout_sets',
      'user_settings',
    ];

    await db.withTransactionAsync(async () => {
      for (const table of tablesWithUserId) {
        await db.runAsync(
          `UPDATE ${table} SET user_id = ?, sync_status = 'pending' WHERE user_id = ?;`,
          [toUserId, fromUserId],
        );
      }
    });
  }

  // ─── Exercises ──────────────────────────────────────────────────

  async getExercises(options?: {
    includeDeleted?: boolean;
  }): Promise<Exercise[]> {
    const db = await this.getDb();
    const where = options?.includeDeleted ? '' : 'WHERE deleted_at IS NULL';
    const rows = await db.getAllAsync<RawExerciseRow>(
      `SELECT * FROM exercises ${where} ORDER BY name ASC;`,
    );
    return rows.map(mapExerciseRow);
  }

  async getExerciseById(id: string): Promise<Exercise | null> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<RawExerciseRow>(
      'SELECT * FROM exercises WHERE id = ?;',
      [id],
    );
    return row ? mapExerciseRow(row) : null;
  }

  private async upsertExerciseInternal(
    db: SQLite.SQLiteDatabase,
    ex: Exercise,
  ): Promise<void> {
    await db.runAsync(
      `INSERT OR REPLACE INTO exercises (
        id, user_id, name, primary_muscle, secondary_muscles, equipment,
        instructions, media_url, is_custom, preferred_weight_unit,
        created_at, updated_at, deleted_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        ex.id,
        ex.user_id,
        ex.name,
        ex.primary_muscle,
        JSON.stringify(ex.secondary_muscles ?? []),
        ex.equipment,
        JSON.stringify(ex.instructions ?? []),
        ex.media_url,
        ex.is_custom ? 1 : 0,
        ex.preferred_weight_unit,
        ex.created_at,
        ex.updated_at,
        ex.deleted_at,
        ex.sync_status ?? 'pending',
      ],
    );
  }

  async upsertExercise(exercise: Exercise): Promise<void> {
    const db = await this.getDb();
    await this.upsertExerciseInternal(db, exercise);
  }

  async upsertExercisesBatch(exercises: Exercise[]): Promise<void> {
    if (exercises.length === 0) return;
    const db = await this.getDb();
    await db.withTransactionAsync(async () => {
      for (const ex of exercises) {
        await this.upsertExerciseInternal(db, ex);
      }
    });
  }

  async softDeleteExercise(id: string, deletedAt: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `UPDATE exercises SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?;`,
      [deletedAt, deletedAt, id],
    );
  }

  // ─── Routine Folders ────────────────────────────────────────────

  async getRoutineFolders(userId: string): Promise<RoutineFolder[]> {
    const db = await this.getDb();
    return db.getAllAsync<RoutineFolder>(
      'SELECT * FROM routine_folders WHERE user_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC;',
      [userId],
    );
  }

  private async upsertRoutineFolderInternal(
    db: SQLite.SQLiteDatabase,
    folder: RoutineFolder,
  ): Promise<void> {
    await db.runAsync(
      `INSERT OR REPLACE INTO routine_folders (
        id, user_id, name, sort_order, created_at, updated_at, deleted_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        folder.id,
        folder.user_id,
        folder.name,
        folder.sort_order,
        folder.created_at,
        folder.updated_at,
        folder.deleted_at,
        folder.sync_status ?? 'pending',
      ],
    );
  }

  async upsertRoutineFolder(folder: RoutineFolder): Promise<void> {
    const db = await this.getDb();
    await this.upsertRoutineFolderInternal(db, folder);
  }

  async softDeleteRoutineFolder(id: string, deletedAt: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `UPDATE routine_folders SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?;`,
      [deletedAt, deletedAt, id],
    );
  }

  // ─── Routines ───────────────────────────────────────────────────

  async getRoutines(userId: string): Promise<Routine[]> {
    const db = await this.getDb();
    return db.getAllAsync<Routine>(
      'SELECT * FROM routines WHERE user_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC;',
      [userId],
    );
  }

  async getRoutineById(id: string): Promise<Routine | null> {
    const db = await this.getDb();
    return db.getFirstAsync<Routine>(
      'SELECT * FROM routines WHERE id = ? AND deleted_at IS NULL;',
      [id],
    );
  }

  private async upsertRoutineInternal(
    db: SQLite.SQLiteDatabase,
    routine: Routine,
  ): Promise<void> {
    await db.runAsync(
      `INSERT OR REPLACE INTO routines (
        id, user_id, folder_id, name, notes, sort_order,
        created_at, updated_at, deleted_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        routine.id,
        routine.user_id,
        routine.folder_id,
        routine.name,
        routine.notes,
        routine.sort_order,
        routine.created_at,
        routine.updated_at,
        routine.deleted_at,
        routine.sync_status ?? 'pending',
      ],
    );
  }

  async upsertRoutine(routine: Routine): Promise<void> {
    const db = await this.getDb();
    await this.upsertRoutineInternal(db, routine);
  }

  async softDeleteRoutine(id: string, deletedAt: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `UPDATE routines SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?;`,
      [deletedAt, deletedAt, id],
    );
  }

  // ─── Routine Exercises & Sets ───────────────────────────────────

  async getRoutineExercises(routineId: string): Promise<RoutineExercise[]> {
    const db = await this.getDb();
    return db.getAllAsync<RoutineExercise>(
      'SELECT * FROM routine_exercises WHERE routine_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC;',
      [routineId],
    );
  }

  private async upsertRoutineExerciseInternal(
    db: SQLite.SQLiteDatabase,
    item: RoutineExercise,
  ): Promise<void> {
    await db.runAsync(
      `INSERT OR REPLACE INTO routine_exercises (
        id, user_id, routine_id, exercise_id, sort_order, rest_seconds, notes,
        created_at, updated_at, deleted_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        item.id,
        item.user_id,
        item.routine_id,
        item.exercise_id,
        item.sort_order,
        item.rest_seconds,
        item.notes,
        item.created_at,
        item.updated_at,
        item.deleted_at,
        item.sync_status ?? 'pending',
      ],
    );
  }

  async upsertRoutineExercise(item: RoutineExercise): Promise<void> {
    const db = await this.getDb();
    await this.upsertRoutineExerciseInternal(db, item);
  }

  async softDeleteRoutineExercise(
    id: string,
    deletedAt: string,
  ): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `UPDATE routine_exercises SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?;`,
      [deletedAt, deletedAt, id],
    );
  }

  async getRoutineSets(routineExerciseId: string): Promise<RoutineSet[]> {
    const db = await this.getDb();
    return db.getAllAsync<RoutineSet>(
      'SELECT * FROM routine_sets WHERE routine_exercise_id = ? AND deleted_at IS NULL ORDER BY set_number ASC;',
      [routineExerciseId],
    );
  }

  private async upsertRoutineSetInternal(
    db: SQLite.SQLiteDatabase,
    item: RoutineSet,
  ): Promise<void> {
    await db.runAsync(
      `INSERT OR REPLACE INTO routine_sets (
        id, user_id, routine_exercise_id, set_number, set_type,
        target_weight, target_reps, target_reps_max, target_rpe,
        created_at, updated_at, deleted_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        item.id,
        item.user_id,
        item.routine_exercise_id,
        item.set_number,
        item.set_type,
        item.target_weight,
        item.target_reps,
        item.target_reps_max,
        item.target_rpe,
        item.created_at,
        item.updated_at,
        item.deleted_at,
        item.sync_status ?? 'pending',
      ],
    );
  }

  async upsertRoutineSet(item: RoutineSet): Promise<void> {
    const db = await this.getDb();
    await this.upsertRoutineSetInternal(db, item);
  }

  async softDeleteRoutineSet(id: string, deletedAt: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `UPDATE routine_sets SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?;`,
      [deletedAt, deletedAt, id],
    );
  }

  // ─── Workouts ───────────────────────────────────────────────────

  async getWorkouts(userId: string): Promise<Workout[]> {
    const db = await this.getDb();
    return db.getAllAsync<Workout>(
      'SELECT * FROM workouts WHERE user_id = ? AND deleted_at IS NULL ORDER BY started_at DESC;',
      [userId],
    );
  }

  async getWorkoutById(id: string): Promise<Workout | null> {
    const db = await this.getDb();
    return db.getFirstAsync<Workout>(
      'SELECT * FROM workouts WHERE id = ? AND deleted_at IS NULL;',
      [id],
    );
  }

  private async upsertWorkoutInternal(
    db: SQLite.SQLiteDatabase,
    workout: Workout,
  ): Promise<void> {
    await db.runAsync(
      `INSERT OR REPLACE INTO workouts (
        id, user_id, routine_id, name, notes, started_at, finished_at,
        duration_seconds, total_volume_kg, total_sets,
        created_at, updated_at, deleted_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        workout.id,
        workout.user_id,
        workout.routine_id,
        workout.name,
        workout.notes,
        workout.started_at,
        workout.finished_at,
        workout.duration_seconds,
        workout.total_volume_kg,
        workout.total_sets,
        workout.created_at,
        workout.updated_at,
        workout.deleted_at,
        workout.sync_status ?? 'pending',
      ],
    );
  }

  async upsertWorkout(workout: Workout): Promise<void> {
    const db = await this.getDb();
    await this.upsertWorkoutInternal(db, workout);
  }

  async softDeleteWorkout(id: string, deletedAt: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `UPDATE workouts SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?;`,
      [deletedAt, deletedAt, id],
    );
  }

  // ─── Workout Exercises & Sets ───────────────────────────────────

  async getWorkoutExercises(workoutId: string): Promise<WorkoutExercise[]> {
    const db = await this.getDb();
    return db.getAllAsync<WorkoutExercise>(
      'SELECT * FROM workout_exercises WHERE workout_id = ? AND deleted_at IS NULL ORDER BY sort_order ASC;',
      [workoutId],
    );
  }

  private async upsertWorkoutExerciseInternal(
    db: SQLite.SQLiteDatabase,
    item: WorkoutExercise,
  ): Promise<void> {
    await db.runAsync(
      `INSERT OR REPLACE INTO workout_exercises (
        id, user_id, workout_id, exercise_id, sort_order, weight_unit,
        rest_seconds, notes, created_at, updated_at, deleted_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        item.id,
        item.user_id,
        item.workout_id,
        item.exercise_id,
        item.sort_order,
        item.weight_unit,
        item.rest_seconds,
        item.notes,
        item.created_at,
        item.updated_at,
        item.deleted_at,
        item.sync_status ?? 'pending',
      ],
    );
  }

  async upsertWorkoutExercise(item: WorkoutExercise): Promise<void> {
    const db = await this.getDb();
    await this.upsertWorkoutExerciseInternal(db, item);
  }

  async softDeleteWorkoutExercise(
    id: string,
    deletedAt: string,
  ): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `UPDATE workout_exercises SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?;`,
      [deletedAt, deletedAt, id],
    );
  }

  async getWorkoutSets(workoutExerciseId: string): Promise<WorkoutSet[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<RawWorkoutSetRow>(
      'SELECT * FROM workout_sets WHERE workout_exercise_id = ? AND deleted_at IS NULL ORDER BY set_number ASC;',
      [workoutExerciseId],
    );
    return rows.map(mapWorkoutSetRow);
  }

  private async upsertWorkoutSetInternal(
    db: SQLite.SQLiteDatabase,
    item: WorkoutSet,
  ): Promise<void> {
    await db.runAsync(
      `INSERT OR REPLACE INTO workout_sets (
        id, user_id, workout_exercise_id, set_number, set_type,
        weight, reps, rpe, is_completed, completed_at,
        created_at, updated_at, deleted_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        item.id,
        item.user_id,
        item.workout_exercise_id,
        item.set_number,
        item.set_type,
        item.weight,
        item.reps,
        item.rpe,
        item.is_completed ? 1 : 0,
        item.completed_at,
        item.created_at,
        item.updated_at,
        item.deleted_at,
        item.sync_status ?? 'pending',
      ],
    );
  }

  async upsertWorkoutSet(item: WorkoutSet): Promise<void> {
    const db = await this.getDb();
    await this.upsertWorkoutSetInternal(db, item);
  }

  async softDeleteWorkoutSet(id: string, deletedAt: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `UPDATE workout_sets SET deleted_at = ?, updated_at = ?, sync_status = 'pending' WHERE id = ?;`,
      [deletedAt, deletedAt, id],
    );
  }

  // ─── Previous Value Lookup ──────────────────────────────────────

  async getPreviousExercisePerformance(
    userId: string,
    exerciseId: string,
  ): Promise<PreviousSetPerformance[]> {
    const db = await this.getDb();
    const lastExercise = await db.getFirstAsync<{
      id: string;
      weight_unit: 'kg' | 'lbs';
    }>(
      `SELECT we.id, we.weight_unit
       FROM workout_exercises we
       INNER JOIN workouts w ON w.id = we.workout_id
       WHERE w.user_id = ?
         AND w.deleted_at IS NULL
         AND we.deleted_at IS NULL
         AND we.exercise_id = ?
       ORDER BY w.started_at DESC
       LIMIT 1;`,
      [userId, exerciseId],
    );

    if (!lastExercise) return [];

    const sets = await db.getAllAsync<{
      set_number: number;
      weight: number;
      reps: number;
      rpe: number | null;
    }>(
      `SELECT set_number, weight, reps, rpe
       FROM workout_sets
       WHERE workout_exercise_id = ?
         AND deleted_at IS NULL
         AND is_completed = 1
       ORDER BY set_number ASC;`,
      [lastExercise.id],
    );

    return sets.map((s) => ({
      set_number: s.set_number,
      weight: s.weight,
      reps: s.reps,
      weight_unit: lastExercise.weight_unit,
      rpe: s.rpe,
    }));
  }

  // ─── Active Workout Draft ───────────────────────────────────────

  async getActiveWorkoutDraft(): Promise<ActiveWorkoutDraft | null> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<{ payload: string }>(
      'SELECT payload FROM active_workout_draft WHERE id = ?;',
      ['current'],
    );
    if (!row) return null;
    try {
      return JSON.parse(row.payload) as ActiveWorkoutDraft;
    } catch {
      return null;
    }
  }

  async saveActiveWorkoutDraft(draft: ActiveWorkoutDraft): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      'INSERT OR REPLACE INTO active_workout_draft (id, payload, updated_at) VALUES (?, ?, ?);',
      ['current', JSON.stringify(draft), draft.updated_at],
    );
  }

  async clearActiveWorkoutDraft(): Promise<void> {
    const db = await this.getDb();
    await db.runAsync('DELETE FROM active_workout_draft WHERE id = ?;', [
      'current',
    ]);
  }

  // ─── User Settings ──────────────────────────────────────────────

  async getUserSettings(userId: string): Promise<UserSettings | null> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<RawUserSettingsRow>(
      'SELECT * FROM user_settings WHERE user_id = ?;',
      [userId],
    );
    return row ? mapUserSettingsRow(row) : null;
  }

  private async upsertUserSettingsInternal(
    db: SQLite.SQLiteDatabase,
    settings: UserSettings,
  ): Promise<void> {
    await db.runAsync(
      `INSERT OR REPLACE INTO user_settings (
        user_id, theme, default_weight_unit, default_rest_seconds,
        barbell_weight_kg, barbell_weight_lbs, available_plates_kg,
        available_plates_lbs, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        settings.user_id,
        settings.theme,
        settings.default_weight_unit,
        settings.default_rest_seconds,
        settings.barbell_weight_kg,
        settings.barbell_weight_lbs,
        JSON.stringify(settings.available_plates_kg),
        JSON.stringify(settings.available_plates_lbs),
        settings.updated_at,
        settings.sync_status ?? 'pending',
      ],
    );
  }

  async upsertUserSettings(settings: UserSettings): Promise<void> {
    const db = await this.getDb();
    await this.upsertUserSettingsInternal(db, settings);
  }
}

export const localDb: LocalDatabase = new SqliteLocalDatabase();
