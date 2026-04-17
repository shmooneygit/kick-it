import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutRecord, UserStats } from '@/lib/types';
import { buildNextStats, emptyStats } from '@/lib/history-utils';

const HISTORY_KEY = 'workout_history';
const STATS_KEY = 'user_stats';

interface HistoryStore {
  history: WorkoutRecord[];
  stats: UserStats;
  loaded: boolean;
  load: () => Promise<void>;
  addWorkout: (record: WorkoutRecord) => Promise<void>;
  clearAll: () => Promise<void>;
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
    } catch (error) {
      console.warn('[history-store] load failed:', error);
      set({ loaded: true });
    }
  },

  addWorkout: async (record) => {
    const { history, stats } = get();
    let updatedHistory = [record, ...history];

    if (updatedHistory.length > 500) {
      updatedHistory = updatedHistory.slice(0, 500);
    }

    const newStats: UserStats = buildNextStats(stats, record);

    set({ history: updatedHistory, stats: newStats });

    await Promise.all([
      AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory)),
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
