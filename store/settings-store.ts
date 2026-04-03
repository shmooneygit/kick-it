import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n from '@/lib/i18n';
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

interface SettingsStore {
  settings: AppSettings;
  loaded: boolean;
  load: () => Promise<void>;
  update: (partial: Partial<AppSettings>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: { ...defaults },
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      const nextSettings = raw
        ? { ...defaults, ...(JSON.parse(raw) as Partial<AppSettings>) }
        : { ...defaults };
      i18n.locale = nextSettings.language;
      if (raw) {
        set({ settings: nextSettings, loaded: true });
      } else {
        set({ settings: nextSettings, loaded: true });
      }
    } catch {
      i18n.locale = defaults.language;
      set({ loaded: true });
    }
  },

  update: async (partial) => {
    const next = { ...get().settings, ...partial };
    i18n.locale = next.language;
    set({ settings: next });
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  },

  completeOnboarding: async () => {
    const next = { ...get().settings, onboardingComplete: true };
    i18n.locale = next.language;
    set({ settings: next });
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  },
}));
