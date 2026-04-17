import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsStore } from '@/store/settings-store';
import {
  WorkoutConfig,
  TimerState,
  TimerMode,
  SessionResult,
  PersistedSession,
} from '@/lib/types';

const LAST_CONFIGS_KEY = 'workout_last_configs';

const DEFAULT_BOXING: WorkoutConfig = {
  mode: 'boxing',
  rounds: 3,
  workDuration: 180,
  restDuration: 60,
  countdownDuration: 5,
};

const DEFAULT_TABATA: WorkoutConfig = {
  mode: 'tabata',
  rounds: 8,
  workDuration: 20,
  restDuration: 10,
  countdownDuration: 10,
};

const initialTimerState: TimerState = {
  phase: 'countdown',
  currentRound: 1,
  totalRounds: 0,
  secondsRemaining: 0,
  phaseRemainingMs: 0,
  phaseDurationMs: 0,
  totalElapsedSeconds: 0,
  totalElapsedMs: 0,
  isPaused: false,
  isRunning: false,
  updatedAt: null,
};

interface WorkoutStore {
  config: WorkoutConfig;
  setConfig: (config: Partial<WorkoutConfig>) => void;
  resetConfig: (mode: TimerMode) => void;
  loadConfig: (config: WorkoutConfig, presetId?: string | null) => void;
  activePresetId: string | null;
  setActivePresetId: (id: string | null) => void;
  lastResult: SessionResult | null;
  setLastResult: (result: SessionResult) => void;
  clearLastResult: () => void;

  lastBoxingConfig: WorkoutConfig | null;
  lastTabataConfig: WorkoutConfig | null;
  rememberLastConfig: (config: WorkoutConfig) => void;
  getLastConfigForMode: (mode: TimerMode) => WorkoutConfig;
  loadLastConfigs: () => Promise<void>;

  timerState: TimerState;
  setTimerState: (state: Partial<TimerState>) => void;
  resetTimerState: () => void;
  recoverableSession: PersistedSession | null;
  setRecoverableSession: (session: PersistedSession | null) => void;
  pendingResumeSession: PersistedSession | null;
  setPendingResumeSession: (session: PersistedSession | null) => void;
}

function sanitizeDuration(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function sanitizeRounds(value: number): number {
  return Math.max(1, Math.round(value));
}

function sanitizeConfig(config: WorkoutConfig): WorkoutConfig {
  const isTabata = config.mode === 'tabata';

  return {
    mode: config.mode,
    rounds: Math.min(isTabata ? 30 : 50, sanitizeRounds(config.rounds)),
    workDuration: sanitizeDuration(
      config.workDuration,
      isTabata ? 10 : 15,
      isTabata ? 120 : 900,
    ),
    restDuration: sanitizeDuration(
      config.restDuration,
      5,
      isTabata ? 60 : 300,
    ),
    countdownDuration: sanitizeDuration(config.countdownDuration, 5, 30),
  };
}

function createConfig(mode: TimerMode): WorkoutConfig {
  const settings = useSettingsStore.getState().settings;
  const base = mode === 'boxing' ? DEFAULT_BOXING : DEFAULT_TABATA;

  return sanitizeConfig({
    ...base,
    countdownDuration:
      mode === 'boxing' ? settings.defaultCountdown : base.countdownDuration,
  });
}

async function persistLastConfigs(
  lastBoxingConfig: WorkoutConfig | null,
  lastTabataConfig: WorkoutConfig | null,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      LAST_CONFIGS_KEY,
      JSON.stringify({ lastBoxingConfig, lastTabataConfig }),
    );
  } catch {
    // ignore
  }
}

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  config: createConfig('boxing'),
  setConfig: (partial) =>
    set((s) => ({ config: sanitizeConfig({ ...s.config, ...partial }) })),
  resetConfig: (mode) =>
    set({
      config: createConfig(mode),
      activePresetId: null,
    }),
  loadConfig: (config, presetId = null) =>
    set({ config: sanitizeConfig(config), activePresetId: presetId }),
  activePresetId: null,
  setActivePresetId: (id) => set({ activePresetId: id }),
  lastResult: null,
  setLastResult: (result) => set({ lastResult: result }),
  clearLastResult: () => set({ lastResult: null }),

  lastBoxingConfig: null,
  lastTabataConfig: null,
  rememberLastConfig: (config) => {
    const sanitized = sanitizeConfig(config);
    const next =
      sanitized.mode === 'boxing'
        ? { lastBoxingConfig: sanitized }
        : { lastTabataConfig: sanitized };
    set(next);
    const state = get();
    void persistLastConfigs(
      sanitized.mode === 'boxing' ? sanitized : state.lastBoxingConfig,
      sanitized.mode === 'tabata' ? sanitized : state.lastTabataConfig,
    );
  },
  getLastConfigForMode: (mode) => {
    const state = get();
    const stored =
      mode === 'boxing' ? state.lastBoxingConfig : state.lastTabataConfig;
    if (stored) return sanitizeConfig({ ...stored, mode });
    return createConfig(mode);
  },
  loadLastConfigs: async () => {
    try {
      const raw = await AsyncStorage.getItem(LAST_CONFIGS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        lastBoxingConfig?: WorkoutConfig | null;
        lastTabataConfig?: WorkoutConfig | null;
      };
      set({
        lastBoxingConfig: parsed.lastBoxingConfig
          ? sanitizeConfig({ ...parsed.lastBoxingConfig, mode: 'boxing' })
          : null,
        lastTabataConfig: parsed.lastTabataConfig
          ? sanitizeConfig({ ...parsed.lastTabataConfig, mode: 'tabata' })
          : null,
      });
    } catch {
      // ignore
    }
  },

  timerState: initialTimerState,
  setTimerState: (partial) =>
    set((s) => ({ timerState: { ...s.timerState, ...partial } })),
  resetTimerState: () => set({ timerState: { ...initialTimerState } }),
  recoverableSession: null,
  setRecoverableSession: (session) => set({ recoverableSession: session }),
  pendingResumeSession: null,
  setPendingResumeSession: (session) => set({ pendingResumeSession: session }),
}));
