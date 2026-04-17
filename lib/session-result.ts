import { SessionResult, TimerMode, TimerState } from './types';

export function getCompletedRounds(state: TimerState): number {
  switch (state.phase) {
    case 'countdown':
      return 0;
    case 'work':
      return Math.max(0, state.currentRound - 1);
    case 'rest':
    case 'finished':
      return state.currentRound;
  }
}

export function createSessionResult(
  state: TimerState,
  mode: TimerMode,
  wasCompleted: boolean,
): SessionResult {
  return {
    mode,
    completedRounds: getCompletedRounds(state),
    totalDuration: state.totalElapsedSeconds,
    wasCompleted,
  };
}
