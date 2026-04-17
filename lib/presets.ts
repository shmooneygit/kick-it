import { BuiltInPreset } from './types';

export const boxingPresets: BuiltInPreset[] = [
  {
    id: 'boxing_classic',
    name: { uk: 'Класичний', en: 'Classic' },
    icon: '🥊',
    mode: 'boxing',
    rounds: 3,
    workDuration: 180,
    restDuration: 60,
    countdownDuration: 5,
    isBuiltIn: true,
  },
  {
    id: 'boxing_sparring',
    name: { uk: 'Спаринг', en: 'Sparring' },
    icon: '🤼',
    mode: 'boxing',
    rounds: 5,
    workDuration: 120,
    restDuration: 60,
    countdownDuration: 10,
    isBuiltIn: true,
  },
  {
    id: 'boxing_rocky',
    name: { uk: 'Роккі', en: 'Rocky' },
    icon: '💪',
    mode: 'boxing',
    rounds: 15,
    workDuration: 180,
    restDuration: 30,
    countdownDuration: 5,
    isBuiltIn: true,
  },
  {
    id: 'boxing_warmup',
    name: { uk: 'Розминка', en: 'Warm-up' },
    icon: '🏃',
    mode: 'boxing',
    rounds: 6,
    workDuration: 60,
    restDuration: 30,
    countdownDuration: 5,
    isBuiltIn: true,
  },
];

export const tabataPresets: BuiltInPreset[] = [
  {
    id: 'tabata_classic',
    name: { uk: 'Класична', en: 'Classic' },
    icon: '⏱️',
    mode: 'tabata',
    rounds: 8,
    workDuration: 20,
    restDuration: 10,
    countdownDuration: 10,
    isBuiltIn: true,
  },
  {
    id: 'tabata_beginner',
    name: { uk: 'Початківець', en: 'Beginner' },
    icon: '🌱',
    mode: 'tabata',
    rounds: 8,
    workDuration: 30,
    restDuration: 15,
    countdownDuration: 10,
    isBuiltIn: true,
  },
  {
    id: 'tabata_advanced',
    name: { uk: 'Просунутий', en: 'Advanced' },
    icon: '🔥',
    mode: 'tabata',
    rounds: 10,
    workDuration: 40,
    restDuration: 20,
    countdownDuration: 10,
    isBuiltIn: true,
  },
  {
    id: 'tabata_endurance',
    name: { uk: 'Витривалість', en: 'Endurance' },
    icon: '🏃',
    mode: 'tabata',
    rounds: 12,
    workDuration: 20,
    restDuration: 10,
    countdownDuration: 10,
    isBuiltIn: true,
  },
];

export function getPresetsForMode(mode: 'boxing' | 'tabata'): BuiltInPreset[] {
  return mode === 'boxing' ? boxingPresets : tabataPresets;
}
