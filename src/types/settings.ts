import type { ThemeMode } from '@/constants/theme';

export type WeightUnit = 'kg' | 'lbs';

export interface SettingsState {
  theme: ThemeMode;
  defaultWeightUnit: WeightUnit;
  defaultRestSeconds: number;
  barbellWeightKg: number;
  barbellWeightLbs: number;
  availablePlatesKg: number[];
  availablePlatesLbs: number[];
}

export interface UserSettings {
  user_id: string;
  theme: ThemeMode;
  default_weight_unit: WeightUnit;
  default_rest_seconds: number;
  barbell_weight_kg: number;
  barbell_weight_lbs: number;
  available_plates_kg: number[];
  available_plates_lbs: number[];
  updated_at: string;
  sync_status?: 'pending' | 'synced' | 'error';
}
