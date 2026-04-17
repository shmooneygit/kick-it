export type TimerMode = 'boxing' | 'tabata';
export type TimerPhase = 'countdown' | 'work' | 'rest' | 'finished';

export interface WorkoutConfig {
  mode: TimerMode;
  rounds: number;
  workDuration: number;
  restDuration: number;
  countdownDuration: number;
}

export interface BasePreset extends WorkoutConfig {
  id: string;
  name: { uk: string; en: string };
  icon: string;
}

export interface BuiltInPreset extends BasePreset {
  isBuiltIn: true;
}

export interface UserPreset extends BasePreset {
  isBuiltIn: false;
  createdAt: number;
}

export type Preset = BuiltInPreset | UserPreset;

export interface WorkoutRecord {
  id: string;
  date: string;
  mode: TimerMode;
  config: WorkoutConfig;
  completedRounds: number;
  totalDuration: number;
  wasCompleted: boolean;
  presetId?: string;
  presetName?: string;
}

export interface SessionResult {
  mode: TimerMode;
  completedRounds: number;
  totalDuration: number;
  wasCompleted: boolean;
}

export interface PersistedSession {
  programId: string | null;
  programName?: string;
  config: WorkoutConfig;
  currentRound: number;
  totalRounds: number;
  phaseTimeRemainingMs: number;
  phase: Exclude<TimerPhase, 'finished'>;
  totalElapsedMs: number;
  timestamp: number;
  isPaused: boolean;
}

export interface UserStats {
  totalWorkouts: number;
  totalRounds: number;
  totalDuration: number;
  boxingWorkouts: number;
  tabataWorkouts: number;
  currentStreak: number;
  bestStreak: number;
  lastWorkoutDate: string;
}

export interface BadgeDef {
  id: string;
  icon: string;
  name: { uk: string; en: string };
  description: { uk: string; en: string };
  target?: number;
}

export interface BadgeState {
  id: string;
  earned: boolean;
  earnedDate?: string;
  progress?: { current: number; target: number };
}

export interface TimerState {
  phase: TimerPhase;
  currentRound: number;
  totalRounds: number;
  secondsRemaining: number;
  phaseRemainingMs: number;
  phaseDurationMs: number;
  totalElapsedSeconds: number;
  totalElapsedMs: number;
  isPaused: boolean;
  isRunning: boolean;
  updatedAt: number | null;
}

export interface AppSettings {
  language: 'uk' | 'en';
  hapticLevel: 'off' | 'light' | 'strong';
  defaultCountdown: number;
}
