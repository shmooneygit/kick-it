import { differenceInCalendarDays, format, parseISO, startOfDay } from 'date-fns';
import { UserStats, WorkoutRecord } from './types';

export const emptyStats: UserStats = {
  totalWorkouts: 0,
  totalRounds: 0,
  totalDuration: 0,
  boxingWorkouts: 0,
  tabataWorkouts: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastWorkoutDate: '',
};

export function calcStreak(
  existingStreak: number,
  bestStreak: number,
  lastWorkoutDate: string,
  newDate: string,
): { currentStreak: number; bestStreak: number } {
  const today = startOfDay(parseISO(newDate));

  if (!lastWorkoutDate) {
    return { currentStreak: 1, bestStreak: Math.max(bestStreak, 1) };
  }

  const lastDay = startOfDay(parseISO(lastWorkoutDate));
  const diff = differenceInCalendarDays(today, lastDay);

  if (diff === 0) {
    return {
      currentStreak: existingStreak,
      bestStreak: Math.max(bestStreak, existingStreak),
    };
  }

  if (diff === 1) {
    const next = existingStreak + 1;
    return { currentStreak: next, bestStreak: Math.max(bestStreak, next) };
  }

  return { currentStreak: 1, bestStreak: Math.max(bestStreak, 1) };
}

export function buildNextStats(stats: UserStats, record: WorkoutRecord): UserStats {
  const dateStr = format(parseISO(record.date), 'yyyy-MM-dd');
  const { currentStreak, bestStreak } = calcStreak(
    stats.currentStreak,
    stats.bestStreak,
    stats.lastWorkoutDate,
    dateStr,
  );

  return {
    totalWorkouts: stats.totalWorkouts + 1,
    totalRounds: stats.totalRounds + record.completedRounds,
    totalDuration: stats.totalDuration + record.totalDuration,
    boxingWorkouts: stats.boxingWorkouts + (record.mode === 'boxing' ? 1 : 0),
    tabataWorkouts: stats.tabataWorkouts + (record.mode === 'tabata' ? 1 : 0),
    currentStreak,
    bestStreak,
    lastWorkoutDate: dateStr,
  };
}
