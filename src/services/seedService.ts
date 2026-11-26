import seedData from '@/constants/seedExercises.json';
import { localDb } from '@/lib/storage';
import type { EquipmentType, Exercise, MuscleGroup } from '@/types/database';

interface SeedExerciseRaw {
  id: string;
  name: string;
  primary_muscle: MuscleGroup;
  secondary_muscles: MuscleGroup[];
  equipment: EquipmentType;
  instructions: string[];
}

const SEED_TIMESTAMP = '2026-01-01T00:00:00.000Z';

let seedPromise: Promise<number> | null = null;

/**
 * Seeds foundational system exercises into the local database on first launch
 * (or when new seed exercises are added in app updates).
 *
 * Uses deterministic UUIDs and marks records as `sync_status: 'synced'`
 * with `user_id: null` so they are never pushed to the user's sync outbox.
 */
export async function seedSystemExercisesIfNeeded(): Promise<number> {
  if (seedPromise) {
    return seedPromise;
  }

  seedPromise = (async () => {
    try {
      const existing = await localDb.getExercises({ includeDeleted: true });
      const existingIds = new Set(existing.map((e) => e.id));

      const rawSeeds = seedData as SeedExerciseRaw[];
      const missingExercises: Exercise[] = rawSeeds
        .filter((seed) => !existingIds.has(seed.id))
        .map((seed) => ({
          id: seed.id,
          user_id: null,
          name: seed.name,
          primary_muscle: seed.primary_muscle,
          secondary_muscles: seed.secondary_muscles,
          equipment: seed.equipment,
          instructions: seed.instructions,
          media_url: null,
          is_custom: false,
          preferred_weight_unit: null,
          created_at: SEED_TIMESTAMP,
          updated_at: SEED_TIMESTAMP,
          deleted_at: null,
          sync_status: 'synced',
        }));

      if (missingExercises.length > 0) {
        await localDb.upsertExercisesBatch(missingExercises);
      }

      return missingExercises.length;
    } finally {
      seedPromise = null;
    }
  })();

  return seedPromise;
}
