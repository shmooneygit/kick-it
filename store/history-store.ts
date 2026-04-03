import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutRecord, UserStats } from '@/lib/types';
import {
  startOfDay,
  differenceInCalendarDays,
  parseISO,
  format,
} from 'date-fns';

const HISTORY_KEY = 'workout_history';
const STATS_KEY = 'user_stats';

const emptyStats: UserStats = {
  totalWorkouts: 0,
  totalRounds: 0,
  totalDuration: 0,
  boxingWorkouts: 0,
  tabataWorkouts: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastWorkoutDate: '',
};

interface HistoryStore {
  history: WorkoutRecord[];
  stats: UserStats;
  loaded: boolean;
  load: () => Promise<void>;
  addWorkout: (record: WorkoutRecord) => Promise<void>;
  clearAll: () => Promise<void>;
}

function calcStreak(
  history: WorkoutRecord[],
  existingStreak: number,
  lastWorkoutDate: string,
  newDate: string,
): { currentStreak: number; bestStreak: number } {
  const today = startOfDay(parseISO(newDate));

  if (!lastWorkoutDate) {
    return { currentStreak: 1, bestStreak: Math.max(existingStreak, 1) };
  }

  const lastDay = startOfDay(parseISO(lastWorkoutDate));
  const diff = differenceInCalendarDays(today, lastDay);

  if (diff === 0) {
    // Same day — streak unchanged
    return {
      currentStreak: existingStreak,
      bestStreak: Math.max(existingStreak, existingStreak),
    };
  }
  if (diff === 1) {
    // Consecutive day — extend streak
    const next = existingStreak + 1;
    return { currentStreak: next, bestStreak: Math.max(existingStreak, next) };
  }
  // Gap — reset streak
  return { currentStreak: 1, bestStreak: Math.max(existingStreak, 1) };
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  history: [],
  stats: { ...emptyStats },
  loaded: false,

  load: async () => {
    try {
      const [rawH, rawS] = await Promise.all([
        AsyncStorage.getItem(HISTORY_KEY),
        AsyncStorage.getItem(STATS_KEY),
      ]);
      const history: WorkoutRecord[] = rawH ? JSON.parse(rawH) : [];
      const stats: UserStats = rawS ? JSON.parse(rawS) : { ...emptyStats };
      set({ history, stats, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  addWorkout: async (record) => {
    const { history, stats } = get();
    const newHistory = [record, ...history];

    const dateStr = format(parseISO(record.date), 'yyyy-MM-dd');
    const { currentStreak, bestStreak } = calcStreak(
      newHistory,
      stats.currentStreak,
      stats.lastWorkoutDate,
      dateStr,
    );

    const newStats: UserStats = {
      totalWorkouts: stats.totalWorkouts + 1,
      totalRounds: stats.totalRounds + record.completedRounds,
      totalDuration: stats.totalDuration + record.totalDuration,
      boxingWorkouts:
        stats.boxingWorkouts + (record.mode === 'boxing' ? 1 : 0),
      tabataWorkouts:
        stats.tabataWorkouts + (record.mode === 'tabata' ? 1 : 0),
      currentStreak,
      bestStreak,
      lastWorkoutDate: dateStr,
    };

    set({ history: newHistory, stats: newStats });

    await Promise.all([
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory)),
      AsyncStorage.setItem(STATS_KEY, JSON.stringify(newStats)),
    ]);
  },

  clearAll: async () => {
    set({ history: [], stats: { ...emptyStats } });
    await Promise.all([
      AsyncStorage.removeItem(HISTORY_KEY),
      AsyncStorage.removeItem(STATS_KEY),
    ]);
  },
}));
