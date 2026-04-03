import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { AppSettings } from '@/lib/types';

const SETTINGS_KEY = 'app_settings';

function detectLanguage(): 'uk' | 'en' {
  const code = getLocales()[0]?.languageCode ?? 'en';
  return code === 'uk' ? 'uk' : 'en';
}

const defaults: AppSettings = {
  language: detectLanguage(),
  soundScheme: 'bell',
  announceRounds: true,
  vibrationEnabled: true,
  defaultCountdown: 5,
  onboardingComplete: false,
};

function clampToStep(value: number, min: number, max: number, step: number): number {
  if (!Number.isFinite(value)) return min;
  const clamped = Math.min(max, Math.max(min, value));
  const steps = Math.round((clamped - min) / step);
  return min + steps * step;
}

function normalizeSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    language: settings.language === 'uk' ? 'uk' : 'en',
    defaultCountdown: clampToStep(settings.defaultCountdown, 5, 30, 5),
  };
}

interface SettingsStore {
  settings: AppSettings;
  language: 'uk' | 'en';
  loaded: boolean;
  load: () => Promise<void>;
  update: (partial: Partial<AppSettings>) => Promise<void>;
  setLanguage: (language: 'uk' | 'en') => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: { ...defaults },
  language: defaults.language,
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      const nextSettings = normalizeSettings(
        raw
          ? { ...defaults, ...(JSON.parse(raw) as Partial<AppSettings>) }
          : { ...defaults },
      );
      set({ settings: nextSettings, language: nextSettings.language, loaded: true });
    } catch {
      set({ settings: { ...defaults }, language: defaults.language, loaded: true });
    }
  },

  update: async (partial) => {
    const next = normalizeSettings({ ...get().settings, ...partial });
    set({ settings: next, language: next.language });
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  },

  setLanguage: async (language) => {
    const next = normalizeSettings({ ...get().settings, language });
    set({ settings: next, language: next.language });
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  },

  completeOnboarding: async () => {
    const next = normalizeSettings({ ...get().settings, onboardingComplete: true });
    set({ settings: next, language: next.language });
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  },
}));
