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

const DB_NAME = 'liftos_web_db';
const DB_VERSION = 1;

const OBJECT_STORES = [
  'user_settings',
  'exercises',
  'routine_folders',
  'routines',
  'routine_exercises',
  'routine_sets',
  'workouts',
  'workout_exercises',
  'workout_sets',
  'kv_store',
] as const;

type StoreName = (typeof OBJECT_STORES)[number];

/**
 * IndexedDB implementation for Expo Web, with automatic in-memory fallback
 * when running in SSR or environments without IndexedDB.
 */
class WebLocalDatabase implements LocalDatabase {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private memoryFallback = new Map<StoreName, Map<string, unknown>>();

  private hasIndexedDb(): boolean {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  }

  async init(): Promise<void> {
    if (this.db || !this.hasIndexedDb()) {
      for (const store of OBJECT_STORES) {
        if (!this.memoryFallback.has(store)) {
          this.memoryFallback.set(store, new Map());
        }
      }
      return;
    }

    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        for (const store of OBJECT_STORES) {
          if (!db.objectStoreNames.contains(store)) {
            const keyPath =
              store === 'user_settings'
                ? 'user_id'
                : store === 'kv_store'
                  ? 'key'
                  : 'id';
            db.createObjectStore(store, { keyPath });
          }
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onerror = () => {
        reject(request.error ?? new Error('Failed to open IndexedDB'));
      };
    });

    return this.initPromise;
  }

  private async ensureReady(): Promise<IDBDatabase | null> {
    if (!this.db) {
      await this.init();
    }
    return this.db;
  }

  // ─── Generic Store Helpers ──────────────────────────────────────

  private async getAll<T>(storeName: StoreName): Promise<T[]> {
    const db = await this.ensureReady();
    if (!db) {
      return Array.from(this.memoryFallback.get(storeName)?.values() ?? []) as T[];
    }

    return new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result ?? []) as T[]);
      req.onerror = () => reject(req.error);
    });
  }

  private async getByKey<T>(storeName: StoreName, key: string): Promise<T | null> {
    const db = await this.ensureReady();
    if (!db) {
      return (this.memoryFallback.get(storeName)?.get(key) as T) ?? null;
    }

    return new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  private async put<T extends Record<string, unknown>>(
    storeName: StoreName,
    value: T,
  ): Promise<void> {
    const db = await this.ensureReady();
    if (!db) {
      const keyField =
        storeName === 'user_settings'
          ? 'user_id'
          : storeName === 'kv_store'
            ? 'key'
            : 'id';
      this.memoryFallback.get(storeName)?.set(String(value[keyField]), value);
      return;
    }

    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async putBatch<T extends Record<string, unknown>>(
    storeName: StoreName,
    values: T[],
  ): Promise<void> {
    if (values.length === 0) return;
    const db = await this.ensureReady();
    if (!db) {
      const keyField =
        storeName === 'user_settings'
          ? 'user_id'
          : storeName === 'kv_store'
            ? 'key'
            : 'id';
      const map = this.memoryFallback.get(storeName);
      for (const val of values) {
        map?.set(String(val[keyField]), val);
      }
      return;
    }

    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      for (const val of values) {
        store.put(val);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async deleteByKey(storeName: StoreName, key: string): Promise<void> {
    const db = await this.ensureReady();
    if (!db) {
      this.memoryFallback.get(storeName)?.delete(key);
      return;
    }

    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async softDeleteInStore(
    storeName: StoreName,
    id: string,
    deletedAt: string,
  ): Promise<void> {
    const existing = await this.getByKey<Record<string, unknown>>(storeName, id);
    if (!existing) return;
    await this.put(storeName, {
      ...existing,
      deleted_at: deletedAt,
      updated_at: deletedAt,
      sync_status: 'pending',
    });
  }

  // ─── Sync Metadata & Outbox ─────────────────────────────────────

  async getLastSyncedAt(): Promise<string | null> {
    const row = await this.getByKey<{ key: string; value: string }>(
      'kv_store',
      'last_synced_at',
    );
    return row?.value ?? null;
  }

  async setLastSyncedAt(isoTimestamp: string): Promise<void> {
    await this.put('kv_store', { key: 'last_synced_at', value: isoTimestamp });
  }

  async getPendingRecords<T>(table: SyncableTableName): Promise<T[]> {
    const all = await this.getAll<Record<string, unknown>>(table);
    return all.filter((r) => r.sync_status === 'pending') as unknown as T[];
  }

  async markRecordsSynced(
    table: SyncableTableName,
    ids: string[],
  ): Promise<void> {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    const keyField = table === 'user_settings' ? 'user_id' : 'id';
    const all = await this.getAll<Record<string, unknown>>(table);
    const updated = all
      .filter((r) => idSet.has(String(r[keyField])))
      .map((r) => ({ ...r, sync_status: 'synced' }));
    await this.putBatch(table, updated);
  }

  async upsertSyncedRecords<T extends Record<string, unknown>>(
    table: SyncableTableName,
    records: T[],
  ): Promise<void> {
    const normalized = records.map((r) => ({ ...r, sync_status: 'synced' }));
    await this.putBatch(table, normalized);
  }

  async reassignLocalUser(fromUserId: string, toUserId: string): Promise<void> {
    if (fromUserId === toUserId) return;
    const tables: SyncableTableName[] = [
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

    for (const table of tables) {
      const all = await this.getAll<Record<string, unknown>>(table);
      const changed = all
        .filter((r) => r.user_id === fromUserId)
        .map((r) => ({ ...r, user_id: toUserId, sync_status: 'pending' }));
      if (changed.length > 0) {
        await this.putBatch(table, changed);
      }
    }
  }

  // ─── Exercises ──────────────────────────────────────────────────

  async getExercises(options?: {
    includeDeleted?: boolean;
  }): Promise<Exercise[]> {
    const all = await this.getAll<Exercise>('exercises');
    const filtered = options?.includeDeleted
      ? all
      : all.filter((e) => e.deleted_at === null);
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getExerciseById(id: string): Promise<Exercise | null> {
    return this.getByKey<Exercise>('exercises', id);
  }

  async upsertExercise(exercise: Exercise): Promise<void> {
    await this.put('exercises', {
      ...exercise,
      sync_status: exercise.sync_status ?? 'pending',
    });
  }

  async upsertExercisesBatch(exercises: Exercise[]): Promise<void> {
    await this.putBatch(
      'exercises',
      exercises.map((e) => ({ ...e, sync_status: e.sync_status ?? 'synced' })),
    );
  }

  async softDeleteExercise(id: string, deletedAt: string): Promise<void> {
    await this.softDeleteInStore('exercises', id, deletedAt);
  }

  // ─── Routine Folders ────────────────────────────────────────────

  async getRoutineFolders(userId: string): Promise<RoutineFolder[]> {
    const all = await this.getAll<RoutineFolder>('routine_folders');
    return all
      .filter((f) => f.user_id === userId && f.deleted_at === null)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  async upsertRoutineFolder(folder: RoutineFolder): Promise<void> {
    await this.put('routine_folders', {
      ...folder,
      sync_status: folder.sync_status ?? 'pending',
    });
  }

  async softDeleteRoutineFolder(id: string, deletedAt: string): Promise<void> {
    await this.softDeleteInStore('routine_folders', id, deletedAt);
  }

  // ─── Routines ───────────────────────────────────────────────────

  async getRoutines(userId: string): Promise<Routine[]> {
    const all = await this.getAll<Routine>('routines');
    return all
      .filter((r) => r.user_id === userId && r.deleted_at === null)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  async getRoutineById(id: string): Promise<Routine | null> {
    const routine = await this.getByKey<Routine>('routines', id);
    return routine && routine.deleted_at === null ? routine : null;
  }

  async upsertRoutine(routine: Routine): Promise<void> {
    await this.put('routines', {
      ...routine,
      sync_status: routine.sync_status ?? 'pending',
    });
  }

  async softDeleteRoutine(id: string, deletedAt: string): Promise<void> {
    await this.softDeleteInStore('routines', id, deletedAt);
  }

  // ─── Routine Exercises & Sets ───────────────────────────────────

  async getRoutineExercises(routineId: string): Promise<RoutineExercise[]> {
    const all = await this.getAll<RoutineExercise>('routine_exercises');
    return all
      .filter((re) => re.routine_id === routineId && re.deleted_at === null)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  async upsertRoutineExercise(item: RoutineExercise): Promise<void> {
    await this.put('routine_exercises', {
      ...item,
      sync_status: item.sync_status ?? 'pending',
    });
  }

  async softDeleteRoutineExercise(
    id: string,
    deletedAt: string,
  ): Promise<void> {
    await this.softDeleteInStore('routine_exercises', id, deletedAt);
  }

  async getRoutineSets(routineExerciseId: string): Promise<RoutineSet[]> {
    const all = await this.getAll<RoutineSet>('routine_sets');
    return all
      .filter(
        (rs) =>
          rs.routine_exercise_id === routineExerciseId &&
          rs.deleted_at === null,
      )
      .sort((a, b) => a.set_number - b.set_number);
  }

  async upsertRoutineSet(item: RoutineSet): Promise<void> {
    await this.put('routine_sets', {
      ...item,
      sync_status: item.sync_status ?? 'pending',
    });
  }

  async softDeleteRoutineSet(id: string, deletedAt: string): Promise<void> {
    await this.softDeleteInStore('routine_sets', id, deletedAt);
  }

  // ─── Workouts ───────────────────────────────────────────────────

  async getWorkouts(userId: string): Promise<Workout[]> {
    const all = await this.getAll<Workout>('workouts');
    return all
      .filter((w) => w.user_id === userId && w.deleted_at === null)
      .sort((a, b) => b.started_at.localeCompare(a.started_at));
  }

  async getWorkoutById(id: string): Promise<Workout | null> {
    const workout = await this.getByKey<Workout>('workouts', id);
    return workout && workout.deleted_at === null ? workout : null;
  }

  async upsertWorkout(workout: Workout): Promise<void> {
    await this.put('workouts', {
      ...workout,
      sync_status: workout.sync_status ?? 'pending',
    });
  }

  async softDeleteWorkout(id: string, deletedAt: string): Promise<void> {
    await this.softDeleteInStore('workouts', id, deletedAt);
  }

  // ─── Workout Exercises & Sets ───────────────────────────────────

  async getWorkoutExercises(workoutId: string): Promise<WorkoutExercise[]> {
    const all = await this.getAll<WorkoutExercise>('workout_exercises');
    return all
      .filter((we) => we.workout_id === workoutId && we.deleted_at === null)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  async upsertWorkoutExercise(item: WorkoutExercise): Promise<void> {
    await this.put('workout_exercises', {
      ...item,
      sync_status: item.sync_status ?? 'pending',
    });
  }

  async softDeleteWorkoutExercise(
    id: string,
    deletedAt: string,
  ): Promise<void> {
    await this.softDeleteInStore('workout_exercises', id, deletedAt);
  }

  async getWorkoutSets(workoutExerciseId: string): Promise<WorkoutSet[]> {
    const all = await this.getAll<WorkoutSet>('workout_sets');
    return all
      .filter(
        (ws) =>
          ws.workout_exercise_id === workoutExerciseId &&
          ws.deleted_at === null,
      )
      .sort((a, b) => a.set_number - b.set_number);
  }

  async upsertWorkoutSet(item: WorkoutSet): Promise<void> {
    await this.put('workout_sets', {
      ...item,
      sync_status: item.sync_status ?? 'pending',
    });
  }

  async softDeleteWorkoutSet(id: string, deletedAt: string): Promise<void> {
    await this.softDeleteInStore('workout_sets', id, deletedAt);
  }

  // ─── Previous Value Lookup ──────────────────────────────────────

  async getPreviousExercisePerformance(
    userId: string,
    exerciseId: string,
  ): Promise<PreviousSetPerformance[]> {
    const workouts = await this.getWorkouts(userId);
    if (workouts.length === 0) return [];

    const allWorkoutExercises =
      await this.getAll<WorkoutExercise>('workout_exercises');

    for (const workout of workouts) {
      const match = allWorkoutExercises.find(
        (we) =>
          we.workout_id === workout.id &&
          we.exercise_id === exerciseId &&
          we.deleted_at === null,
      );
      if (!match) continue;

      const sets = await this.getWorkoutSets(match.id);
      const completedSets = sets.filter((s) => s.is_completed);
      return completedSets.map((s) => ({
        set_number: s.set_number,
        weight: s.weight,
        reps: s.reps,
        weight_unit: match.weight_unit,
        rpe: s.rpe,
      }));
    }

    return [];
  }

  // ─── Active Workout Draft ───────────────────────────────────────

  async getActiveWorkoutDraft(): Promise<ActiveWorkoutDraft | null> {
    const row = await this.getByKey<{
      key: string;
      value: ActiveWorkoutDraft;
    }>('kv_store', 'active_workout_draft');
    return row?.value ?? null;
  }

  async saveActiveWorkoutDraft(draft: ActiveWorkoutDraft): Promise<void> {
    await this.put('kv_store', {
      key: 'active_workout_draft',
      value: draft,
    });
  }

  async clearActiveWorkoutDraft(): Promise<void> {
    await this.deleteByKey('kv_store', 'active_workout_draft');
  }

  // ─── User Settings ──────────────────────────────────────────────

  async getUserSettings(userId: string): Promise<UserSettings | null> {
    return this.getByKey<UserSettings>('user_settings', userId);
  }

  async upsertUserSettings(settings: UserSettings): Promise<void> {
    await this.put('user_settings', {
      ...settings,
      sync_status: settings.sync_status ?? 'pending',
    });
  }
}

export const localDb: LocalDatabase = new WebLocalDatabase();
