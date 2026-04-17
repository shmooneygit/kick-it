import { TimerPhase, TimerState, WorkoutConfig } from './types';

export interface TimerAdvanceResult {
  phase: TimerPhase;
  secondsRemaining: number;
  phaseRemainingMs: number;
  phaseDurationMs: number;
  currentRound: number;
  totalElapsedSeconds: number;
  totalElapsedMs: number;
  isRunning: boolean;
  didFinish: boolean;
  didChangePhase: boolean;
}

export function getNextPhase(
  config: WorkoutConfig,
  currentPhase: TimerPhase,
  currentRound: number,
): { phase: TimerPhase; seconds: number; round: number } {
  switch (currentPhase) {
    case 'countdown':
      return { phase: 'work', seconds: config.workDuration, round: 1 };
    case 'work':
      if (currentRound >= config.rounds) {
        return { phase: 'finished', seconds: 0, round: currentRound };
      }
      return { phase: 'rest', seconds: config.restDuration, round: currentRound };
    case 'rest':
      return { phase: 'work', seconds: config.workDuration, round: currentRound + 1 };
    case 'finished':
      return { phase: 'finished', seconds: 0, round: currentRound };
  }
}

export function getPlannedDuration(config: WorkoutConfig): number {
  return (
    config.countdownDuration +
    config.rounds * config.workDuration +
    Math.max(0, config.rounds - 1) * config.restDuration
  );
}

export function getPhaseDurationSeconds(
  config: WorkoutConfig,
  phase: TimerPhase,
): number {
  switch (phase) {
    case 'countdown':
      return config.countdownDuration;
    case 'work':
      return config.workDuration;
    case 'rest':
      return config.restDuration;
    case 'finished':
      return 0;
  }
}

export function getPhaseDurationMs(
  config: WorkoutConfig,
  phase: TimerPhase,
): number {
  return getPhaseDurationSeconds(config, phase) * 1000;
}

function toWholeSecondsRemaining(remainingMs: number, phase: TimerPhase): number {
  if (phase === 'finished') {
    return 0;
  }

  return Math.max(0, Math.ceil(remainingMs / 1000));
}

export function advanceTimerState(
  config: WorkoutConfig,
  state: Pick<
    TimerState,
    | 'phase'
    | 'currentRound'
    | 'secondsRemaining'
    | 'phaseRemainingMs'
    | 'phaseDurationMs'
    | 'totalElapsedSeconds'
    | 'totalElapsedMs'
  >,
  elapsedMs: number,
): TimerAdvanceResult {
  let remainingMs = state.phaseRemainingMs - elapsedMs;
  let currentPhase = state.phase;
  let currentRound = state.currentRound;
  let phaseDurationMs =
    state.phaseDurationMs > 0
      ? state.phaseDurationMs
      : getPhaseDurationMs(config, state.phase);

  while (remainingMs <= 0 && currentPhase !== 'finished') {
    const next = getNextPhase(config, currentPhase, currentRound);
    currentPhase = next.phase;
    currentRound = next.round;

    if (next.phase === 'finished') {
      remainingMs = 0;
      phaseDurationMs = 0;
      break;
    }

    phaseDurationMs = next.seconds * 1000;
    remainingMs += phaseDurationMs;
  }

  const totalElapsedMs = Math.min(
    state.totalElapsedMs + elapsedMs,
    getPlannedDuration(config) * 1000,
  );
  const didFinish = currentPhase === 'finished';

  return {
    phase: currentPhase,
    secondsRemaining: didFinish ? 0 : toWholeSecondsRemaining(remainingMs, currentPhase),
    phaseRemainingMs: didFinish ? 0 : Math.max(0, remainingMs),
    phaseDurationMs,
    currentRound,
    totalElapsedSeconds: Math.floor(totalElapsedMs / 1000),
    totalElapsedMs,
    isRunning: !didFinish,
    didFinish,
    didChangePhase:
      currentPhase !== state.phase || currentRound !== state.currentRound,
  };
}
