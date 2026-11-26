import { localDb, LOCAL_USER_ID } from '@/lib/storage';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { SyncableTableName } from '@/types/database';

// ─── Constants ──────────────────────────────────────────────────

/**
 * Dependency-ordered list of syncable tables.
 * Parents must be pushed before children to satisfy foreign key constraints.
 */
export const SYNC_TABLE_ORDER: SyncableTableName[] = [
  'routine_folders',
  'exercises',
  'routines',
  'routine_exercises',
  'routine_sets',
  'workouts',
  'workout_exercises',
  'workout_sets',
  'user_settings',
];

// ─── Types ──────────────────────────────────────────────────────

export interface SyncResult {
  status: 'synced' | 'offline' | 'error';
  pushedCount: number;
  pulledCount: number;
  lastSyncedAt: string | null;
  error?: string;
}

type SyncStateListener = (
  status: 'idle' | 'syncing' | 'synced' | 'offline' | 'error',
  lastSyncedAt?: string | null,
  error?: string | null,
) => void;

// ─── Module State ───────────────────────────────────────────────

let inFlightSync: Promise<SyncResult> | null = null;
const listeners = new Set<SyncStateListener>();

export function subscribeSyncState(listener: SyncStateListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(
  status: 'idle' | 'syncing' | 'synced' | 'offline' | 'error',
  lastSyncedAt?: string | null,
  error?: string | null,
): void {
  for (const listener of listeners) {
    listener(status, lastSyncedAt, error);
  }
}

// ─── Pure Conflict & Payload Helpers ────────────────────────────

function getPrimaryKeyField(table: SyncableTableName): string {
  return table === 'user_settings' ? 'user_id' : 'id';
}

function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return true;
  }
  const message =
    err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('failed to fetch') ||
    message.includes('timeout') ||
    message.includes('offline')
  );
}

/**
 * Strips local-only fields (`sync_status`) before pushing to Supabase
 * and ensures `user_id` matches the authenticated user.
 */
export function preparePushPayload<T extends Record<string, unknown>>(
  table: SyncableTableName,
  records: T[],
  userId: string,
): Record<string, unknown>[] {
  return records
    .filter((record) => {
      // Never push system exercises (user_id === null / is_custom === false)
      if (table === 'exercises' && record.is_custom === false) {
        return false;
      }
      return true;
    })
    .map((record) => {
      const { sync_status: _localOnly, ...rest } = record;
      return {
        ...rest,
        user_id: userId,
      };
    });
}

/**
 * Last-Write-Wins (LWW) conflict resolution:
 * Protects any local pending record whose `updated_at` is newer than or equal
 * to the incoming remote record.
 */
export function resolveLwwConflicts<T extends Record<string, unknown>>(
  table: SyncableTableName,
  remoteRecords: T[],
  localPendingRecords: T[],
): T[] {
  if (localPendingRecords.length === 0) {
    return remoteRecords;
  }

  const pkField = getPrimaryKeyField(table);
  const pendingById = new Map<string, T>();
  for (const local of localPendingRecords) {
    pendingById.set(String(local[pkField]), local);
  }

  return remoteRecords.filter((remote) => {
    const key = String(remote[pkField]);
    const localPending = pendingById.get(key);
    if (!localPending) return true;

    const remoteUpdated = Date.parse(String(remote.updated_at ?? ''));
    const localUpdated = Date.parse(String(localPending.updated_at ?? ''));

    if (Number.isNaN(remoteUpdated) || Number.isNaN(localUpdated)) {
      return false;
    }

    // Remote wins only if strictly newer than the pending local edit
    return remoteUpdated > localUpdated;
  });
}

// ─── Push Outbox ────────────────────────────────────────────────

async function pushOutbox(userId: string): Promise<number> {
  if (!supabase) return 0;

  let totalPushed = 0;

  for (const table of SYNC_TABLE_ORDER) {
    const pending = await localDb.getPendingRecords<Record<string, unknown>>(table);
    if (pending.length === 0) continue;

    const payload = preparePushPayload(table, pending, userId);
    if (payload.length === 0) {
      // e.g. system exercises accidentally marked pending: mark them synced locally
      const pkField = getPrimaryKeyField(table);
      await localDb.markRecordsSynced(
        table,
        pending.map((r) => String(r[pkField])),
      );
      continue;
    }

    const pkField = getPrimaryKeyField(table);
    const { error } = await supabase
      .from(table)
      .upsert(payload, { onConflict: pkField });

    if (error) {
      throw new Error(`Push failed on ${table}: ${error.message}`);
    }

    const pushedIds = payload.map((r) => String(r[pkField]));
    await localDb.markRecordsSynced(table, pushedIds);
    totalPushed += pushedIds.length;
  }

  return totalPushed;
}

// ─── Pull Delta ─────────────────────────────────────────────────

async function pullDelta(lastSyncedAt: string | null): Promise<{
  pulledCount: number;
  newSyncTimestamp: string;
}> {
  if (!supabase) {
    return { pulledCount: 0, newSyncTimestamp: lastSyncedAt ?? new Date().toISOString() };
  }

  const syncStartedAt = new Date().toISOString();
  let totalPulled = 0;

  for (const table of SYNC_TABLE_ORDER) {
    let query = supabase
      .from(table)
      .select('*')
      .order('updated_at', { ascending: true });

    if (lastSyncedAt) {
      query = query.gt('updated_at', lastSyncedAt);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Pull failed on ${table}: ${error.message}`);
    }

    if (!data || data.length === 0) continue;

    const localPending =
      await localDb.getPendingRecords<Record<string, unknown>>(table);
    const winners = resolveLwwConflicts(
      table,
      data as Record<string, unknown>[],
      localPending,
    );

    if (winners.length > 0) {
      await localDb.upsertSyncedRecords(table, winners);
      totalPulled += winners.length;
    }
  }

  return { pulledCount: totalPulled, newSyncTimestamp: syncStartedAt };
}

// ─── Public Sync Entrypoint ─────────────────────────────────────

/**
 * Runs a full Push Outbox → Pull Delta sync cycle for the given authenticated user.
 * Deduplicates concurrent calls via an in-flight promise lock.
 */
export async function syncWithSupabase(userId: string): Promise<SyncResult> {
  if (
    !isSupabaseConfigured ||
    !supabase ||
    !userId ||
    userId === LOCAL_USER_ID
  ) {
    const lastSyncedAt = await localDb.getLastSyncedAt();
    notifyListeners('offline', lastSyncedAt, null);
    return {
      status: 'offline',
      pushedCount: 0,
      pulledCount: 0,
      lastSyncedAt,
    };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const lastSyncedAt = await localDb.getLastSyncedAt();
    notifyListeners('offline', lastSyncedAt, null);
    return {
      status: 'offline',
      pushedCount: 0,
      pulledCount: 0,
      lastSyncedAt,
    };
  }

  if (inFlightSync) {
    return inFlightSync;
  }

  inFlightSync = (async (): Promise<SyncResult> => {
    notifyListeners('syncing', undefined, null);

    try {
      await localDb.init();
      const lastSyncedAt = await localDb.getLastSyncedAt();

      const pushedCount = await pushOutbox(userId);
      const { pulledCount, newSyncTimestamp } = await pullDelta(lastSyncedAt);

      await localDb.setLastSyncedAt(newSyncTimestamp);
      notifyListeners('synced', newSyncTimestamp, null);

      return {
        status: 'synced',
        pushedCount,
        pulledCount,
        lastSyncedAt: newSyncTimestamp,
      };
    } catch (err) {
      const lastSyncedAt = await localDb.getLastSyncedAt().catch(() => null);
      const message = err instanceof Error ? err.message : 'Sync failed';

      if (isNetworkError(err)) {
        notifyListeners('offline', lastSyncedAt, null);
        return {
          status: 'offline',
          pushedCount: 0,
          pulledCount: 0,
          lastSyncedAt,
          error: message,
        };
      }

      notifyListeners('error', lastSyncedAt, message);
      return {
        status: 'error',
        pushedCount: 0,
        pulledCount: 0,
        lastSyncedAt,
        error: message,
      };
    } finally {
      inFlightSync = null;
    }
  })();

  return inFlightSync;
}
