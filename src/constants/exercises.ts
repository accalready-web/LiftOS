import type { EquipmentType, MuscleGroup } from '@/types/database';

export interface OptionItem<T extends string> {
  value: T;
  label: string;
}

export const MUSCLE_GROUPS: OptionItem<MuscleGroup>[] = [
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'quads', label: 'Quads' },
  { value: 'hamstrings', label: 'Hamstrings' },
  { value: 'glutes', label: 'Glutes' },
  { value: 'biceps', label: 'Biceps' },
  { value: 'triceps', label: 'Triceps' },
  { value: 'core', label: 'Core' },
  { value: 'calves', label: 'Calves' },
  { value: 'forearms', label: 'Forearms' },
  { value: 'full_body', label: 'Full Body' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'other', label: 'Other' },
];

export const EQUIPMENT_TYPES: OptionItem<EquipmentType>[] = [
  { value: 'barbell', label: 'Barbell' },
  { value: 'dumbbell', label: 'Dumbbell' },
  { value: 'cable', label: 'Cable' },
  { value: 'machine', label: 'Machine' },
  { value: 'bodyweight', label: 'Bodyweight' },
  { value: 'kettlebell', label: 'Kettlebell' },
  { value: 'bands', label: 'Bands' },
  { value: 'other', label: 'Other' },
];

const MUSCLE_LABEL_MAP = new Map(MUSCLE_GROUPS.map((m) => [m.value, m.label]));
const EQUIPMENT_LABEL_MAP = new Map(EQUIPMENT_TYPES.map((e) => [e.value, e.label]));

export function formatMuscleLabel(muscle: MuscleGroup): string {
  return MUSCLE_LABEL_MAP.get(muscle) ?? muscle;
}

export function formatEquipmentLabel(equipment: EquipmentType): string {
  return EQUIPMENT_LABEL_MAP.get(equipment) ?? equipment;
}
