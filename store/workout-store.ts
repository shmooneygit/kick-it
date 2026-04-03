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
  announceRounds: true,
  soundScheme: 'bell',
};

const DEFAULT_TABATA: WorkoutConfig = {
  mode: 'tabata',
  rounds: 8,
  workDuration: 20,
  restDuration: 10,
  countdownDuration: 5,
  announceRounds: true,
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

function createConfig(mode: TimerMode): WorkoutConfig {
  const settings = useSettingsStore.getState().settings;
  const base = mode === 'boxing' ? DEFAULT_BOXING : DEFAULT_TABATA;

  return {
    ...base,
    countdownDuration: settings.defaultCountdown,
    announceRounds: settings.announceRounds,
    soundScheme: settings.soundScheme,
  };
}

export const useWorkoutStore = create<WorkoutStore>((set) => ({
  config: createConfig('boxing'),
  setConfig: (partial) =>
    set((s) => ({ config: { ...s.config, ...partial } })),
  resetConfig: (mode) =>
    set({
      config: createConfig(mode),
      activePresetId: null,
    }),
  loadConfig: (config, presetId = null) => set({ config, activePresetId: presetId }),
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
