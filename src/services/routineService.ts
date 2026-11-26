import { localDb } from '@/lib/storage';
import { generateUuid } from '@/utils/uuid';
import type {
  Exercise,
  Routine,
  RoutineExercise,
  RoutineFolder,
  RoutineSet,
  SetType,
} from '@/types/database';

// ─── Hydrated Types ─────────────────────────────────────────────

export interface RoutineExerciseWithDetails extends RoutineExercise {
  exercise: Exercise | null;
  sets: RoutineSet[];
}

export interface RoutineWithDetails extends Routine {
  exercises: RoutineExerciseWithDetails[];
}

export interface RoutineSummary extends Routine {
  exerciseCount: number;
  totalSets: number;
  exercisePreview: string[];
}

export interface SaveRoutineSetInput {
  id?: string;
  set_type: SetType;
  target_weight: number | null;
  target_reps: number | null;
  target_reps_max: number | null;
  target_rpe: number | null;
}

export interface SaveRoutineExerciseInput {
  id?: string;
  exercise_id: string;
  rest_seconds: number | null;
  notes: string | null;
  sets: SaveRoutineSetInput[];
}

export interface SaveRoutineInput {
  id?: string;
  folder_id: string | null;
  name: string;
  notes: string | null;
  exercises: SaveRoutineExerciseInput[];
}

// ─── Routine Folders ────────────────────────────────────────────

export async function listRoutineFolders(
  userId: string,
): Promise<RoutineFolder[]> {
  return localDb.getRoutineFolders(userId);
}

export async function createRoutineFolder(
  userId: string,
  name: string,
): Promise<RoutineFolder> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Folder name is required');
  }

  const existing = await localDb.getRoutineFolders(userId);
  const maxOrder = existing.reduce(
    (max, f) => Math.max(max, f.sort_order),
    -1,
  );
  const now = new Date().toISOString();

  const folder: RoutineFolder = {
    id: generateUuid(),
    user_id: userId,
    name: trimmed,
    sort_order: maxOrder + 1,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    sync_status: 'pending',
  };

  await localDb.upsertRoutineFolder(folder);
  return folder;
}

export async function renameRoutineFolder(
  userId: string,
  folderId: string,
  name: string,
): Promise<RoutineFolder> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Folder name is required');
  }

  const folders = await localDb.getRoutineFolders(userId);
  const existing = folders.find((f) => f.id === folderId);
  if (!existing) {
    throw new Error('Folder not found');
  }

  const updated: RoutineFolder = {
    ...existing,
    name: trimmed,
    updated_at: new Date().toISOString(),
    sync_status: 'pending',
  };

  await localDb.upsertRoutineFolder(updated);
  return updated;
}

export async function deleteRoutineFolder(
  userId: string,
  folderId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const routines = await localDb.getRoutines(userId);
  for (const routine of routines) {
    if (routine.folder_id === folderId) {
      await localDb.upsertRoutine({
        ...routine,
        folder_id: null,
        updated_at: now,
        sync_status: 'pending',
      });
    }
  }
  await localDb.softDeleteRoutineFolder(folderId, now);
}

// ─── Routines ───────────────────────────────────────────────────

export async function listRoutinesWithSummary(
  userId: string,
): Promise<RoutineSummary[]> {
  const [routines, allExercises] = await Promise.all([
    localDb.getRoutines(userId),
    localDb.getExercises({ includeDeleted: true }),
  ]);

  const exerciseMap = new Map(allExercises.map((e) => [e.id, e]));
  const summaries: RoutineSummary[] = [];

  for (const routine of routines) {
    const routineExercises = await localDb.getRoutineExercises(routine.id);
    let totalSets = 0;
    const names: string[] = [];

    for (const re of routineExercises) {
      const ex = exerciseMap.get(re.exercise_id);
      if (ex) {
        names.push(ex.name);
      }
      const sets = await localDb.getRoutineSets(re.id);
      totalSets += sets.length;
    }

    summaries.push({
      ...routine,
      exerciseCount: routineExercises.length,
      totalSets,
      exercisePreview: names,
    });
  }

  return summaries;
}

export async function getRoutineWithDetails(
  routineId: string,
): Promise<RoutineWithDetails | null> {
  const routine = await localDb.getRoutineById(routineId);
  if (!routine || routine.deleted_at !== null) {
    return null;
  }

  const [routineExercises, allExercises] = await Promise.all([
    localDb.getRoutineExercises(routine.id),
    localDb.getExercises({ includeDeleted: true }),
  ]);

  const exerciseMap = new Map(allExercises.map((e) => [e.id, e]));
  const hydratedExercises: RoutineExerciseWithDetails[] = [];

  for (const re of routineExercises) {
    const sets = await localDb.getRoutineSets(re.id);
    hydratedExercises.push({
      ...re,
      exercise: exerciseMap.get(re.exercise_id) ?? null,
      sets,
    });
  }

  return {
    ...routine,
    exercises: hydratedExercises,
  };
}

export async function saveRoutineWithDetails(
  userId: string,
  input: SaveRoutineInput,
): Promise<RoutineWithDetails> {
  const trimmedName = input.name.trim();
  if (!trimmedName) {
    throw new Error('Routine name is required');
  }

  const now = new Date().toISOString();
  const existingRoutine = input.id
    ? await localDb.getRoutineById(input.id)
    : null;

  let sortOrder = existingRoutine?.sort_order ?? 0;
  if (!existingRoutine) {
    const existingRoutines = await localDb.getRoutines(userId);
    sortOrder =
      existingRoutines.reduce((max, r) => Math.max(max, r.sort_order), -1) + 1;
  }

  const routine: Routine = {
    id: existingRoutine?.id ?? input.id ?? generateUuid(),
    user_id: userId,
    folder_id: input.folder_id,
    name: trimmedName,
    notes: input.notes?.trim() || null,
    sort_order: sortOrder,
    created_at: existingRoutine?.created_at ?? now,
    updated_at: now,
    deleted_at: null,
    sync_status: 'pending',
  };

  await localDb.upsertRoutine(routine);

  // Soft-delete any removed routine_exercises and their sets
  const previousExercises = existingRoutine
    ? await localDb.getRoutineExercises(routine.id)
    : [];
  const incomingExerciseIds = new Set(
    input.exercises.map((e) => e.id).filter((id): id is string => Boolean(id)),
  );

  for (const prevEx of previousExercises) {
    if (!incomingExerciseIds.has(prevEx.id)) {
      const prevSets = await localDb.getRoutineSets(prevEx.id);
      for (const s of prevSets) {
        await localDb.softDeleteRoutineSet(s.id, now);
      }
      await localDb.softDeleteRoutineExercise(prevEx.id, now);
    }
  }

  // Upsert current exercises & sets
  const prevExMap = new Map(previousExercises.map((e) => [e.id, e]));

  for (let exIdx = 0; exIdx < input.exercises.length; exIdx++) {
    const exInput = input.exercises[exIdx];
    const prevEx = exInput.id ? prevExMap.get(exInput.id) : undefined;
    const routineExerciseId = prevEx?.id ?? exInput.id ?? generateUuid();

    const routineExercise: RoutineExercise = {
      id: routineExerciseId,
      user_id: userId,
      routine_id: routine.id,
      exercise_id: exInput.exercise_id,
      sort_order: exIdx,
      rest_seconds: exInput.rest_seconds,
      notes: exInput.notes?.trim() || null,
      created_at: prevEx?.created_at ?? now,
      updated_at: now,
      deleted_at: null,
      sync_status: 'pending',
    };

    await localDb.upsertRoutineExercise(routineExercise);

    const previousSets = prevEx
      ? await localDb.getRoutineSets(routineExerciseId)
      : [];
    const incomingSetIds = new Set(
      exInput.sets.map((s) => s.id).filter((id): id is string => Boolean(id)),
    );

    for (const prevSet of previousSets) {
      if (!incomingSetIds.has(prevSet.id)) {
        await localDb.softDeleteRoutineSet(prevSet.id, now);
      }
    }

    const prevSetMap = new Map(previousSets.map((s) => [s.id, s]));

    for (let setIdx = 0; setIdx < exInput.sets.length; setIdx++) {
      const setInput = exInput.sets[setIdx];
      const prevSet = setInput.id ? prevSetMap.get(setInput.id) : undefined;

      const routineSet: RoutineSet = {
        id: prevSet?.id ?? setInput.id ?? generateUuid(),
        user_id: userId,
        routine_exercise_id: routineExerciseId,
        set_number: setIdx + 1,
        set_type: setInput.set_type,
        target_weight: setInput.target_weight,
        target_reps: setInput.target_reps,
        target_reps_max: setInput.target_reps_max,
        target_rpe: setInput.target_rpe,
        created_at: prevSet?.created_at ?? now,
        updated_at: now,
        deleted_at: null,
        sync_status: 'pending',
      };

      await localDb.upsertRoutineSet(routineSet);
    }
  }

  const saved = await getRoutineWithDetails(routine.id);
  if (!saved) {
    throw new Error('Failed to load saved routine');
  }
  return saved;
}

export async function duplicateRoutine(
  userId: string,
  routineId: string,
): Promise<RoutineWithDetails> {
  const source = await getRoutineWithDetails(routineId);
  if (!source) {
    throw new Error('Routine not found');
  }

  return saveRoutineWithDetails(userId, {
    folder_id: source.folder_id,
    name: `${source.name} (Copy)`,
    notes: source.notes,
    exercises: source.exercises.map((ex) => ({
      exercise_id: ex.exercise_id,
      rest_seconds: ex.rest_seconds,
      notes: ex.notes,
      sets: ex.sets.map((s) => ({
        set_type: s.set_type,
        target_weight: s.target_weight,
        target_reps: s.target_reps,
        target_reps_max: s.target_reps_max,
        target_rpe: s.target_rpe,
      })),
    })),
  });
}

export async function deleteRoutine(routineId: string): Promise<void> {
  const now = new Date().toISOString();
  const routineExercises = await localDb.getRoutineExercises(routineId);

  for (const re of routineExercises) {
    const sets = await localDb.getRoutineSets(re.id);
    for (const s of sets) {
      await localDb.softDeleteRoutineSet(s.id, now);
    }
    await localDb.softDeleteRoutineExercise(re.id, now);
  }

  await localDb.softDeleteRoutine(routineId, now);
}
