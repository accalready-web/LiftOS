import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { localDb, LOCAL_USER_ID } from '@/lib/storage';
import { seedSystemExercisesIfNeeded } from '@/services/seedService';
import {
  subscribeSyncState,
  syncWithSupabase,
  type SyncResult,
} from '@/services/syncEngine';

// ─── Types ──────────────────────────────────────────────────────

export type SyncStatusType = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLocalOnly: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  syncStatus: SyncStatusType;
  lastSyncedAt: string | null;
  syncError: string | null;
  error: string | null;
}

interface AuthActions {
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  continueLocalOnly: () => void;
  syncNow: () => Promise<SyncResult>;
  setSyncStatus: (status: SyncStatusType, lastSyncedAt?: string | null) => void;
  clearError: () => void;
  getActiveUserId: () => string;
}

let authSubscriptionRegistered = false;
let syncSubscriptionRegistered = false;

// ─── Store ──────────────────────────────────────────────────────

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: null,
  session: null,
  isLocalOnly: false,
  isInitialized: false,
  isLoading: false,
  syncStatus: isSupabaseConfigured ? 'idle' : 'offline',
  lastSyncedAt: null,
  syncError: null,
  error: null,

  initialize: async () => {
    if (get().isInitialized) return;

    if (!syncSubscriptionRegistered) {
      syncSubscriptionRegistered = true;
      subscribeSyncState((status, lastSyncedAt, syncError) => {
        set((state) => ({
          syncStatus: status,
          lastSyncedAt:
            lastSyncedAt !== undefined ? lastSyncedAt : state.lastSyncedAt,
          syncError: syncError !== undefined ? syncError : state.syncError,
        }));
      });
    }

    try {
      await localDb.init();
      await seedSystemExercisesIfNeeded();
      const lastSyncedAt = await localDb.getLastSyncedAt();

      if (!supabase) {
        set({
          isInitialized: true,
          lastSyncedAt,
          syncStatus: 'offline',
        });
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        await localDb.reassignLocalUser(LOCAL_USER_ID, session.user.id);
      }

      set({
        session,
        user: session?.user ?? null,
        isInitialized: true,
        lastSyncedAt,
        syncStatus: session ? 'idle' : 'offline',
      });

      if (session?.user) {
        void get().syncNow();
      }

      if (!authSubscriptionRegistered) {
        authSubscriptionRegistered = true;
        supabase.auth.onAuthStateChange(async (_event, newSession) => {
          if (newSession?.user) {
            await localDb.reassignLocalUser(LOCAL_USER_ID, newSession.user.id);
          }
          set({
            session: newSession,
            user: newSession?.user ?? null,
            isLocalOnly: newSession ? false : get().isLocalOnly,
            syncStatus: newSession ? 'idle' : 'offline',
          });
        });
      }
    } catch (err) {
      set({
        isInitialized: true,
        error: err instanceof Error ? err.message : 'Failed to initialize auth',
      });
    }
  },

  signIn: async (email, password) => {
    if (!supabase) {
      set({
        error:
          'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env, or continue in Local-Only mode.',
      });
      return false;
    }

    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      set({ isLoading: false, error: error.message });
      return false;
    }

    if (data.user) {
      await localDb.reassignLocalUser(LOCAL_USER_ID, data.user.id);
    }

    set({
      session: data.session,
      user: data.user,
      isLocalOnly: false,
      isLoading: false,
      syncStatus: 'idle',
      error: null,
    });

    if (data.user) {
      void get().syncNow();
    }

    return true;
  },

  signUp: async (email, password) => {
    if (!supabase) {
      set({
        error:
          'Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env, or continue in Local-Only mode.',
      });
      return { success: false, needsEmailConfirmation: false };
    }

    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      set({ isLoading: false, error: error.message });
      return { success: false, needsEmailConfirmation: false };
    }

    const needsEmailConfirmation = !data.session;
    if (data.session?.user) {
      await localDb.reassignLocalUser(LOCAL_USER_ID, data.session.user.id);
    }

    set({
      session: data.session,
      user: data.session ? data.user : null,
      isLocalOnly: false,
      isLoading: false,
      syncStatus: data.session ? 'idle' : 'offline',
      error: null,
    });

    if (data.session?.user) {
      void get().syncNow();
    }

    return { success: true, needsEmailConfirmation };
  },

  signOut: async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    set({
      session: null,
      user: null,
      isLocalOnly: false,
      syncStatus: 'offline',
      syncError: null,
      error: null,
    });
  },

  continueLocalOnly: () => {
    set({ isLocalOnly: true, syncStatus: 'offline', error: null });
  },

  syncNow: async () => {
    const userId = get().getActiveUserId();
    return syncWithSupabase(userId);
  },

  setSyncStatus: (syncStatus, lastSyncedAt) => {
    set((state) => ({
      syncStatus,
      lastSyncedAt:
        lastSyncedAt !== undefined ? lastSyncedAt : state.lastSyncedAt,
    }));
  },

  clearError: () => set({ error: null }),

  getActiveUserId: () => get().user?.id ?? LOCAL_USER_ID,
}));
