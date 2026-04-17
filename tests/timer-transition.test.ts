import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { advanceTimerState, getNextPhase } from '../lib/timer-transition';
import { TimerState, WorkoutConfig } from '../lib/types';

const boxingConfig: WorkoutConfig = {
  mode: 'boxing',
  rounds: 3,
  workDuration: 180,
  restDuration: 60,
  countdownDuration: 5,
};

function createState(overrides: Partial<TimerState> = {}): TimerState {
  return {
    phase: 'work',
    currentRound: 1,
    totalRounds: 3,
    secondsRemaining: 90,
    phaseRemainingMs: 90000,
    phaseDurationMs: 180000,
    totalElapsedSeconds: 95,
    totalElapsedMs: 95000,
    isPaused: false,
    isRunning: true,
    updatedAt: 0,
    ...overrides,
  };
}

test('getNextPhase advances from work to rest until final round', () => {
  assert.deepEqual(getNextPhase(boxingConfig, 'work', 1), {
    phase: 'rest',
    seconds: 60,
    round: 1,
  });
  assert.deepEqual(getNextPhase(boxingConfig, 'work', 3), {
    phase: 'finished',
    seconds: 0,
    round: 3,
  });
});

test('advanceTimerState does not mark a phase change when resuming mid-phase', () => {
  const next = advanceTimerState(boxingConfig, createState(), 20000);

  assert.equal(next.phase, 'work');
  assert.equal(next.secondsRemaining, 70);
  assert.equal(next.totalElapsedSeconds, 115);
  assert.equal(next.phaseRemainingMs, 70000);
  assert.equal(next.didChangePhase, false);
  assert.equal(next.didFinish, false);
});

test('advanceTimerState marks a real phase transition when elapsed time crosses a boundary', () => {
  const next = advanceTimerState(
    boxingConfig,
    createState({
      phase: 'work',
      secondsRemaining: 10,
      phaseRemainingMs: 10000,
      totalElapsedSeconds: 260,
      totalElapsedMs: 260000,
    }),
    15000,
  );

  assert.equal(next.phase, 'rest');
  assert.equal(next.currentRound, 1);
  assert.equal(next.secondsRemaining, 55);
  assert.equal(next.phaseDurationMs, 60000);
  assert.equal(next.phaseRemainingMs, 55000);
  assert.equal(next.didChangePhase, true);
  assert.equal(next.didFinish, false);
});

test('advanceTimerState marks finish when elapsed time exceeds the final work phase', () => {
  const next = advanceTimerState(
    boxingConfig,
    createState({
      phase: 'work',
      currentRound: 3,
      secondsRemaining: 2,
      phaseRemainingMs: 2000,
      totalElapsedSeconds: 540,
      totalElapsedMs: 540000,
    }),
    5000,
  );

  assert.equal(next.phase, 'finished');
  assert.equal(next.secondsRemaining, 0);
  assert.equal(next.phaseRemainingMs, 0);
  assert.equal(next.didFinish, true);
  assert.equal(next.didChangePhase, true);
  assert.equal(next.isRunning, false);
});
