import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { createSessionResult } from '../lib/session-result';
import { buildWorkoutRecord } from '../lib/workout-record';
import { TimerState, WorkoutConfig } from '../lib/types';

const config: WorkoutConfig = {
  mode: 'boxing',
  rounds: 3,
  workDuration: 180,
  restDuration: 60,
  countdownDuration: 5,
};

const timerState: TimerState = {
  phase: 'rest',
  currentRound: 2,
  totalRounds: 3,
  secondsRemaining: 30,
  totalElapsedSeconds: 420,
  isPaused: false,
  isRunning: true,
};

test('createSessionResult counts completed rounds from timer state', () => {
  const result = createSessionResult(timerState, 'boxing', false);

  assert.equal(result.completedRounds, 2);
  assert.equal(result.totalDuration, 420);
  assert.equal(result.wasCompleted, false);
});

test('buildWorkoutRecord preserves preset metadata for saved workouts', () => {
  const record = buildWorkoutRecord({
    config,
    sessionResult: createSessionResult(timerState, 'boxing', true),
    date: '2026-04-17T10:00:00.000Z',
    presetId: 'boxing_rocky',
    presetName: 'Rocky',
  });

  assert.match(record.id, /^w_/);
  assert.equal(record.mode, 'boxing');
  assert.equal(record.presetId, 'boxing_rocky');
  assert.equal(record.presetName, 'Rocky');
  assert.equal(record.completedRounds, 2);
  assert.equal(record.wasCompleted, true);
});
