import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserPreset, Preset, WorkoutConfig, TimerMode } from '@/lib/types';
import { getPresetsForMode } from '@/lib/presets';
import i18n from '@/lib/i18n';

const STORAGE_KEY = 'workout_presets_v2';

export function usePresets(mode: TimerMode) {
  const [userPresets, setUserPresets] = useState<UserPreset[]>([]);
  const [loading, setLoading] = useState(true);

  const builtInPresets = getPresetsForMode(mode);

  const loadUserPresets = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const all: UserPreset[] = raw ? JSON.parse(raw) : [];
      setUserPresets(all.filter((preset) => preset.mode === mode));
    } catch {
      setUserPresets([]);
    }
    setLoading(false);
  }, [mode]);

  useEffect(() => {
    loadUserPresets();
  }, [loadUserPresets]);

  const allPresets: Preset[] = [...builtInPresets, ...userPresets];

  const savePreset = useCallback(
    async (name: string, config: WorkoutConfig) => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const all: UserPreset[] = raw ? JSON.parse(raw) : [];
      const preset: UserPreset = {
        id: `user_${config.mode}_${Date.now()}`,
        name: { uk: name, en: name },
        icon: '📁',
        mode: config.mode,
        rounds: config.rounds,
        workDuration: config.workDuration,
        restDuration: config.restDuration,
        countdownDuration: config.countdownDuration,
        announceRounds: config.announceRounds,
        soundScheme: config.soundScheme,
        isBuiltIn: false,
        createdAt: Date.now(),
      };
      all.push(preset);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      await loadUserPresets();
    },
    [loadUserPresets],
  );

  const deletePreset = useCallback(
    async (id: string) => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const all: UserPreset[] = raw ? JSON.parse(raw) : [];
      const filtered = all.filter((p) => p.id !== id);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      await loadUserPresets();
    },
    [loadUserPresets],
  );

  const getPresetName = useCallback((preset: Preset): string => {
    const locale = i18n.locale === 'uk' ? 'uk' : 'en';
    return preset.name[locale] || preset.name.en;
  }, []);

  return { presets: allPresets, userPresets, builtInPresets, loading, savePreset, deletePreset, getPresetName };
}
