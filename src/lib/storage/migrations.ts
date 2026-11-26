import type { SQLiteDatabase } from 'expo-sqlite';

const CURRENT_DB_VERSION = 1;

const SCHEMA_V1_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS user_settings (
    user_id TEXT PRIMARY KEY NOT NULL,
    theme TEXT NOT NULL DEFAULT 'dark',
    default_weight_unit TEXT NOT NULL DEFAULT 'kg',
    default_rest_seconds INTEGER NOT NULL DEFAULT 90,
    barbell_weight_kg REAL NOT NULL DEFAULT 20,
    barbell_weight_lbs REAL NOT NULL DEFAULT 45,
    available_plates_kg TEXT NOT NULL DEFAULT '[25,20,15,10,5,2.5,1.25]',
    available_plates_lbs TEXT NOT NULL DEFAULT '[45,35,25,10,5,2.5]',
    updated_at TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'pending'
  );`,

  `CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NULL,
    name TEXT NOT NULL,
    primary_muscle TEXT NOT NULL,
    secondary_muscles TEXT NOT NULL DEFAULT '[]',
    equipment TEXT NOT NULL,
    instructions TEXT NOT NULL DEFAULT '[]',
    media_url TEXT NULL,
    is_custom INTEGER NOT NULL DEFAULT 0,
    preferred_weight_unit TEXT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT NULL,
    sync_status TEXT NOT NULL DEFAULT 'synced'
  );`,

  `CREATE TABLE IF NOT EXISTS routine_folders (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT NULL,
    sync_status TEXT NOT NULL DEFAULT 'pending'
  );`,

  `CREATE TABLE IF NOT EXISTS routines (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    folder_id TEXT NULL,
    name TEXT NOT NULL,
    notes TEXT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT NULL,
    sync_status TEXT NOT NULL DEFAULT 'pending'
  );`,

  `CREATE TABLE IF NOT EXISTS routine_exercises (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    routine_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    rest_seconds INTEGER NULL,
    notes TEXT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT NULL,
    sync_status TEXT NOT NULL DEFAULT 'pending'
  );`,

  `CREATE TABLE IF NOT EXISTS routine_sets (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    routine_exercise_id TEXT NOT NULL,
    set_number INTEGER NOT NULL,
    set_type TEXT NOT NULL DEFAULT 'normal',
    target_weight REAL NULL,
    target_reps INTEGER NULL,
    target_reps_max INTEGER NULL,
    target_rpe REAL NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT NULL,
    sync_status TEXT NOT NULL DEFAULT 'pending'
  );`,

  `CREATE TABLE IF NOT EXISTS workouts (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    routine_id TEXT NULL,
    name TEXT NOT NULL,
    notes TEXT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT NOT NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    total_volume_kg REAL NOT NULL DEFAULT 0,
    total_sets INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT NULL,
    sync_status TEXT NOT NULL DEFAULT 'pending'
  );`,

  `CREATE TABLE IF NOT EXISTS workout_exercises (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    workout_id TEXT NOT NULL,
    exercise_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    weight_unit TEXT NOT NULL DEFAULT 'kg',
    rest_seconds INTEGER NULL,
    notes TEXT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT NULL,
    sync_status TEXT NOT NULL DEFAULT 'pending'
  );`,

  `CREATE TABLE IF NOT EXISTS workout_sets (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    workout_exercise_id TEXT NOT NULL,
    set_number INTEGER NOT NULL,
    set_type TEXT NOT NULL DEFAULT 'normal',
    weight REAL NOT NULL DEFAULT 0,
    reps INTEGER NOT NULL DEFAULT 0,
    rpe REAL NULL,
    is_completed INTEGER NOT NULL DEFAULT 1,
    completed_at TEXT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT NULL,
    sync_status TEXT NOT NULL DEFAULT 'pending'
  );`,

  // Local-only metadata tables
  `CREATE TABLE IF NOT EXISTS sync_metadata (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS active_workout_draft (
    id TEXT PRIMARY KEY NOT NULL,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // Indexes for fast queries & Previous Value Lookup
  `CREATE INDEX IF NOT EXISTS idx_exercises_muscle ON exercises(primary_muscle, equipment);`,
  `CREATE INDEX IF NOT EXISTS idx_routines_user ON routines(user_id, sort_order);`,
  `CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine ON routine_exercises(routine_id, sort_order);`,
  `CREATE INDEX IF NOT EXISTS idx_routine_sets_re ON routine_sets(routine_exercise_id, set_number);`,
  `CREATE INDEX IF NOT EXISTS idx_workouts_user_started ON workouts(user_id, started_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON workout_exercises(workout_id, sort_order);`,
  `CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise ON workout_exercises(exercise_id);`,
  `CREATE INDEX IF NOT EXISTS idx_workout_sets_we ON workout_sets(workout_exercise_id, set_number);`,
];

export async function runSqliteMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version;',
  );
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion >= CURRENT_DB_VERSION) {
    return;
  }

  await db.withTransactionAsync(async () => {
    if (currentVersion < 1) {
      for (const sql of SCHEMA_V1_STATEMENTS) {
        await db.execAsync(sql);
      }
    }
    await db.execAsync(`PRAGMA user_version = ${CURRENT_DB_VERSION};`);
  });
}
