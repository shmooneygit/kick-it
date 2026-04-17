import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { buildNextStats, calcStreak, emptyStats } from '../lib/history-utils';
import { WorkoutRecord } from '../lib/types';

function createRecord(overrides: Partial<WorkoutRecord> = {}): WorkoutRecord {
  return {
    id: 'w_test',
    date: '2026-04-17T10:00:00.000Z',
    mode: 'boxing',
    config: {
      mode: 'boxing',
      rounds: 3,
      workDuration: 180,
      restDuration: 60,
      countdownDuration: 5,
    },
    completedRounds: 3,
    totalDuration: 540,
    wasCompleted: true,
    ...overrides,
  };
}

test('calcStreak keeps streak unchanged for same-day workout', () => {
  assert.deepEqual(
    calcStreak(4, 6, '2026-04-17', '2026-04-17'),
    { currentStreak: 4, bestStreak: 6 },
  );
});

test('calcStreak extends streak for consecutive day workout', () => {
  assert.deepEqual(
    calcStreak(4, 6, '2026-04-16', '2026-04-17'),
    { currentStreak: 5, bestStreak: 6 },
  );
});

test('buildNextStats updates totals and streaks from a workout record', () => {
  const next = buildNextStats(
    {
      ...emptyStats,
      totalWorkouts: 2,
      totalRounds: 6,
      totalDuration: 1080,
      boxingWorkouts: 2,
      currentStreak: 2,
      bestStreak: 2,
      lastWorkoutDate: '2026-04-16',
    },
    createRecord(),
  );

  assert.equal(next.totalWorkouts, 3);
  assert.equal(next.totalRounds, 9);
  assert.equal(next.totalDuration, 1620);
  assert.equal(next.boxingWorkouts, 3);
  assert.equal(next.tabataWorkouts, 0);
  assert.equal(next.currentStreak, 3);
  assert.equal(next.bestStreak, 3);
  assert.equal(next.lastWorkoutDate, '2026-04-17');
});
