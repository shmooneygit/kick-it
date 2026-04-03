export type TimerMode = 'boxing' | 'tabata';
export type SoundScheme = 'bell' | 'beep' | 'whistle';
export type TimerPhase = 'countdown' | 'work' | 'rest' | 'finished';

export interface WorkoutConfig {
  mode: TimerMode;
  rounds: number;
  workDuration: number;
  restDuration: number;
  countdownDuration: number;
  announceRounds: boolean;
  soundScheme: SoundScheme;
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
  totalElapsedSeconds: number;
  isPaused: boolean;
  isRunning: boolean;
}

export interface AppSettings {
  language: 'uk' | 'en';
  soundScheme: SoundScheme;
  announceRounds: boolean;
  vibrationEnabled: boolean;
  defaultCountdown: number;
  onboardingComplete: boolean;
}
