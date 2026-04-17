import { TimerPhase, TimerState, WorkoutConfig } from './types';

export interface TimerAdvanceResult {
  phase: TimerPhase;
  secondsRemaining: number;
  currentRound: number;
  totalElapsedSeconds: number;
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

export function advanceTimerState(
  config: WorkoutConfig,
  state: Pick<TimerState, 'phase' | 'currentRound' | 'secondsRemaining' | 'totalElapsedSeconds'>,
  elapsedSeconds: number,
): TimerAdvanceResult {
  let remaining = state.secondsRemaining - elapsedSeconds;
  let currentPhase = state.phase;
  let currentRound = state.currentRound;

  while (remaining <= 0 && currentPhase !== 'finished') {
    const next = getNextPhase(config, currentPhase, currentRound);
    currentPhase = next.phase;
    currentRound = next.round;
    remaining += next.seconds;
  }

  const totalElapsedSeconds = Math.min(
    state.totalElapsedSeconds + elapsedSeconds,
    getPlannedDuration(config),
  );
  const didFinish = currentPhase === 'finished';

  return {
    phase: currentPhase,
    secondsRemaining: didFinish ? 0 : Math.max(0, remaining),
    currentRound,
    totalElapsedSeconds,
    isRunning: !didFinish,
    didFinish,
    didChangePhase:
      currentPhase !== state.phase || currentRound !== state.currentRound,
  };
}
