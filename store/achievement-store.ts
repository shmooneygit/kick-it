import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BadgeState, UserStats, WorkoutRecord } from '@/lib/types';
import { badgeDefs, checkBadge } from '@/lib/badges';

const BADGES_KEY = 'badge_states';

interface AchievementStore {
  badges: BadgeState[];
  loaded: boolean;
  load: () => Promise<void>;
  evaluateAfterWorkout: (
    stats: UserStats,
    workout: WorkoutRecord,
  ) => Promise<string[]>;
}

export const useAchievementStore = create<AchievementStore>((set, get) => ({
  badges: [],
  loaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(BADGES_KEY);
      const badges: BadgeState[] = raw ? JSON.parse(raw) : [];
      set({ badges, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  evaluateAfterWorkout: async (stats, workout) => {
    const existing = get().badges;
    const existingMap = new Map(existing.map((b) => [b.id, b]));
    const newlyEarned: string[] = [];
    const updated: BadgeState[] = [];

    for (const def of badgeDefs) {
      const result = checkBadge(def.id, stats, workout);
      const prev = existingMap.get(def.id);

      if (result.earned && (!prev || !prev.earned)) {
        newlyEarned.push(def.id);
        updated.push({
          id: def.id,
          earned: true,
          earnedDate: new Date().toISOString(),
          progress: result.progress,
        });
      } else if (prev) {
        updated.push({ ...prev, progress: result.progress });
      } else {
        updated.push({
          id: def.id,
          earned: result.earned,
          progress: result.progress,
        });
      }
    }

    set({ badges: updated });
    await AsyncStorage.setItem(BADGES_KEY, JSON.stringify(updated));

    return newlyEarned;
  },
}));
