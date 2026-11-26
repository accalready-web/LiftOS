-- LiftOS Initial Database Schema
-- 9 core tables + Indexes + Row Level Security (RLS)
-- Based on docs/02_DESIGN.md Section 4.2

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. user_settings (1:1 per user)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  default_weight_unit text NOT NULL DEFAULT 'kg' CHECK (default_weight_unit IN ('kg', 'lbs')),
  default_rest_seconds integer NOT NULL DEFAULT 90 CHECK (default_rest_seconds >= 0),
  barbell_weight_kg numeric(5, 2) NOT NULL DEFAULT 20,
  barbell_weight_lbs numeric(5, 2) NOT NULL DEFAULT 45,
  available_plates_kg jsonb NOT NULL DEFAULT '[25, 20, 15, 10, 5, 2.5, 1.25]'::jsonb,
  available_plates_lbs jsonb NOT NULL DEFAULT '[45, 35, 25, 10, 5, 2.5]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- 2. exercises (System exercises: user_id IS NULL, Custom: user_id = auth.uid())
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.exercises (
  id uuid PRIMARY KEY,
  user_id uuid NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  primary_muscle text NOT NULL,
  secondary_muscles jsonb NOT NULL DEFAULT '[]'::jsonb,
  equipment text NOT NULL,
  instructions jsonb NOT NULL DEFAULT '[]'::jsonb,
  media_url text NULL,
  is_custom boolean NOT NULL DEFAULT false,
  preferred_weight_unit text NULL CHECK (preferred_weight_unit IS NULL OR preferred_weight_unit IN ('kg', 'lbs')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

-- ============================================================================
-- 3. routine_folders
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.routine_folders (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

-- ============================================================================
-- 4. routines
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.routines (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id uuid NULL REFERENCES public.routine_folders(id) ON DELETE SET NULL,
  name text NOT NULL,
  notes text NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

-- ============================================================================
-- 5. routine_exercises
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.routine_exercises (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id uuid NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
  sort_order integer NOT NULL DEFAULT 0,
  rest_seconds integer NULL CHECK (rest_seconds IS NULL OR rest_seconds >= 0),
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

-- ============================================================================
-- 6. routine_sets
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.routine_sets (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_exercise_id uuid NOT NULL REFERENCES public.routine_exercises(id) ON DELETE CASCADE,
  set_number integer NOT NULL CHECK (set_number >= 1),
  set_type text NOT NULL DEFAULT 'normal' CHECK (set_type IN ('warmup', 'normal', 'dropset', 'failure')),
  target_weight numeric(7, 2) NULL,
  target_reps integer NULL CHECK (target_reps IS NULL OR target_reps >= 0),
  target_reps_max integer NULL CHECK (target_reps_max IS NULL OR target_reps_max >= 0),
  target_rpe numeric(3, 1) NULL CHECK (target_rpe IS NULL OR (target_rpe >= 1.0 AND target_rpe <= 10.0)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

-- ============================================================================
-- 7. workouts
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workouts (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_id uuid NULL REFERENCES public.routines(id) ON DELETE SET NULL,
  name text NOT NULL,
  notes text NULL,
  started_at timestamptz NOT NULL,
  finished_at timestamptz NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  total_volume_kg numeric(10, 2) NOT NULL DEFAULT 0,
  total_sets integer NOT NULL DEFAULT 0 CHECK (total_sets >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

-- ============================================================================
-- 8. workout_exercises
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
  sort_order integer NOT NULL DEFAULT 0,
  weight_unit text NOT NULL DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lbs')),
  rest_seconds integer NULL CHECK (rest_seconds IS NULL OR rest_seconds >= 0),
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

-- ============================================================================
-- 9. workout_sets
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.workout_sets (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_exercise_id uuid NOT NULL REFERENCES public.workout_exercises(id) ON DELETE CASCADE,
  set_number integer NOT NULL CHECK (set_number >= 1),
  set_type text NOT NULL DEFAULT 'normal' CHECK (set_type IN ('warmup', 'normal', 'dropset', 'failure')),
  weight numeric(7, 2) NOT NULL DEFAULT 0,
  reps integer NOT NULL DEFAULT 0 CHECK (reps >= 0),
  rpe numeric(3, 1) NULL CHECK (rpe IS NULL OR (rpe >= 1.0 AND rpe <= 10.0)),
  is_completed boolean NOT NULL DEFAULT true,
  completed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz NULL
);

-- ============================================================================
-- Indexes (Sync Delta Pull, Foreign Keys & History/Previous Lookup)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_user_settings_updated_at ON public.user_settings(updated_at);

CREATE INDEX IF NOT EXISTS idx_exercises_user_updated ON public.exercises(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_equipment ON public.exercises(primary_muscle, equipment) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_routine_folders_user_updated ON public.routine_folders(user_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_routines_user_updated ON public.routines(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_routines_folder ON public.routines(folder_id);

CREATE INDEX IF NOT EXISTS idx_routine_exercises_user_updated ON public.routine_exercises(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine ON public.routine_exercises(routine_id);

CREATE INDEX IF NOT EXISTS idx_routine_sets_user_updated ON public.routine_sets(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_routine_sets_re ON public.routine_sets(routine_exercise_id);

CREATE INDEX IF NOT EXISTS idx_workouts_user_updated ON public.workouts(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_workouts_user_started ON public.workouts(user_id, started_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_workout_exercises_user_updated ON public.workout_exercises(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout ON public.workout_exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise ON public.workout_exercises(exercise_id);

CREATE INDEX IF NOT EXISTS idx_workout_sets_user_updated ON public.workout_sets(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_workout_sets_we ON public.workout_sets(workout_exercise_id);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

-- user_settings: owner only
CREATE POLICY "user_settings_owner_all"
  ON public.user_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- exercises: anyone authenticated can read system exercises (user_id IS NULL) + own custom exercises
CREATE POLICY "exercises_select_system_or_owner"
  ON public.exercises
  FOR SELECT
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "exercises_insert_owner"
  ON public.exercises
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "exercises_update_owner"
  ON public.exercises
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "exercises_delete_owner"
  ON public.exercises
  FOR DELETE
  USING (auth.uid() = user_id);

-- routine_folders: owner only
CREATE POLICY "routine_folders_owner_all"
  ON public.routine_folders
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- routines: owner only
CREATE POLICY "routines_owner_all"
  ON public.routines
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- routine_exercises: owner only
CREATE POLICY "routine_exercises_owner_all"
  ON public.routine_exercises
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- routine_sets: owner only
CREATE POLICY "routine_sets_owner_all"
  ON public.routine_sets
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- workouts: owner only
CREATE POLICY "workouts_owner_all"
  ON public.workouts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- workout_exercises: owner only
CREATE POLICY "workout_exercises_owner_all"
  ON public.workout_exercises
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- workout_sets: owner only
CREATE POLICY "workout_sets_owner_all"
  ON public.workout_sets
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
