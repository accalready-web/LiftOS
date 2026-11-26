import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeMode } from '@/constants/theme';
import type { SettingsState, WeightUnit } from '@/types/settings';

export type { SettingsState, WeightUnit };

interface SettingsActions {
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setDefaultWeightUnit: (unit: WeightUnit) => void;
  setDefaultRestSeconds: (seconds: number) => void;
  setBarbellWeightKg: (weight: number) => void;
  setBarbellWeightLbs: (weight: number) => void;
  setAvailablePlatesKg: (plates: number[]) => void;
  setAvailablePlatesLbs: (plates: number[]) => void;
}

// ─── Defaults (from docs/02_DESIGN.md Section 4.2 user_settings) ─

const DEFAULT_SETTINGS: SettingsState = {
  theme: 'dark',
  defaultWeightUnit: 'kg',
  defaultRestSeconds: 90,
  barbellWeightKg: 20,
  barbellWeightLbs: 45,
  availablePlatesKg: [25, 20, 15, 10, 5, 2.5, 1.25],
  availablePlatesLbs: [45, 35, 25, 10, 5, 2.5],
};

// ─── Store ──────────────────────────────────────────────────────

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setDefaultWeightUnit: (defaultWeightUnit) => set({ defaultWeightUnit }),
      setDefaultRestSeconds: (defaultRestSeconds) =>
        set({ defaultRestSeconds }),
      setBarbellWeightKg: (barbellWeightKg) => set({ barbellWeightKg }),
      setBarbellWeightLbs: (barbellWeightLbs) => set({ barbellWeightLbs }),
      setAvailablePlatesKg: (availablePlatesKg) => set({ availablePlatesKg }),
      setAvailablePlatesLbs: (availablePlatesLbs) =>
        set({ availablePlatesLbs }),
    }),
    {
      name: 'liftos-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
