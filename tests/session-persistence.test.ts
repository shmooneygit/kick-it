import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  resolvePersistedSession,
  restorePersistedTimerState,
} from '../lib/session-persistence';
import { PersistedSession, WorkoutConfig } from '../lib/types';

const boxingConfig: WorkoutConfig = {
  mode: 'boxing',
  rounds: 3,
  workDuration: 180,
  restDuration: 60,
  countdownDuration: 5,
};

function createSession(overrides: Partial<PersistedSession> = {}): PersistedSession {
  return {
    programId: 'boxing_3x3',
    programName: 'Sparring 12 Rounds',
    config: boxingConfig,
    currentRound: 1,
    totalRounds: 3,
    phaseTimeRemainingMs: 10000,
    phase: 'work',
    totalElapsedMs: 120000,
    timestamp: 1000,
    isPaused: false,
    ...overrides,
  };
}

test('resolvePersistedSession advances elapsed wall time into the next phase', () => {
  const resolved = resolvePersistedSession(createSession(), 16000);

  assert.ok(resolved);
  assert.equal(resolved.phase, 'rest');
  assert.equal(resolved.currentRound, 1);
  assert.equal(resolved.phaseTimeRemainingMs, 55000);
  assert.equal(resolved.totalElapsedMs, 135000);
  assert.equal(resolved.timestamp, 16000);
});

test('restorePersistedTimerState keeps paused sessions frozen in place', () => {
  const restored = restorePersistedTimerState(
    createSession({
      phase: 'rest',
      phaseTimeRemainingMs: 42000,
      totalElapsedMs: 240000,
      timestamp: 5000,
      isPaused: true,
    }),
    45000,
  );

  assert.ok(restored);
  assert.equal(restored.phase, 'rest');
  assert.equal(restored.phaseRemainingMs, 42000);
  assert.equal(restored.secondsRemaining, 42);
  assert.equal(restored.totalElapsedMs, 240000);
  assert.equal(restored.isPaused, true);
});
