import { create } from 'zustand';
import { useSettingsStore } from '@/store/settings-store';
import {
  WorkoutConfig,
  TimerState,
  TimerMode,
  SessionResult,
} from '@/lib/types';

const DEFAULT_BOXING: WorkoutConfig = {
  mode: 'boxing',
  rounds: 3,
  workDuration: 180,
  restDuration: 60,
  countdownDuration: 5,
  soundScheme: 'bell',
};

const DEFAULT_TABATA: WorkoutConfig = {
  mode: 'tabata',
  rounds: 8,
  workDuration: 20,
  restDuration: 10,
  countdownDuration: 10,
  soundScheme: 'beep',
};

const initialTimerState: TimerState = {
  phase: 'countdown',
  currentRound: 1,
  totalRounds: 0,
  secondsRemaining: 0,
  totalElapsedSeconds: 0,
  isPaused: false,
  isRunning: false,
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

  timerState: TimerState;
  setTimerState: (state: Partial<TimerState>) => void;
  resetTimerState: () => void;
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
    soundScheme: config.soundScheme,
  };
}

function createConfig(mode: TimerMode): WorkoutConfig {
  const settings = useSettingsStore.getState().settings;
  const base = mode === 'boxing' ? DEFAULT_BOXING : DEFAULT_TABATA;

  return sanitizeConfig({
    ...base,
    countdownDuration:
      mode === 'boxing' ? settings.defaultCountdown : base.countdownDuration,
    soundScheme: settings.soundScheme,
  });
}

export const useWorkoutStore = create<WorkoutStore>((set) => ({
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

  timerState: initialTimerState,
  setTimerState: (partial) =>
    set((s) => ({ timerState: { ...s.timerState, ...partial } })),
  resetTimerState: () => set({ timerState: { ...initialTimerState } }),
}));
