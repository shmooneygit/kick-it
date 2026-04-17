import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { checkBadge } from '../lib/badges';
import { UserStats, WorkoutRecord } from '../lib/types';

const stats: UserStats = {
  totalWorkouts: 20,
  totalRounds: 500,
  totalDuration: 10000,
  boxingWorkouts: 20,
  tabataWorkouts: 5,
  currentStreak: 7,
  bestStreak: 10,
  lastWorkoutDate: '2026-04-17',
};

const record: WorkoutRecord = {
  id: 'w_test',
  date: '2026-04-17T05:30:00.000Z',
  mode: 'boxing',
  config: {
    mode: 'boxing',
    rounds: 15,
    workDuration: 180,
    restDuration: 30,
    countdownDuration: 5,
  },
  completedRounds: 15,
  totalDuration: 2800,
  wasCompleted: true,
  presetId: 'boxing_rocky',
  presetName: 'Rocky',
};

test('checkBadge unlocks preset-specific and milestone badges from saved workouts', () => {
  assert.equal(checkBadge('rocky', stats, record).earned, true);
  assert.equal(checkBadge('marathon', stats, record).earned, true);
  assert.deepEqual(checkBadge('boxing_fan', stats, record).progress, {
    current: 20,
    target: 20,
  });
});
