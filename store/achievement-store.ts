import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BadgeDef, BadgeState, WorkoutRecord } from '@/lib/types';
import { badgeDefs, checkBadge } from '@/lib/badges';
import { useHistoryStore } from '@/store/history-store';

const BADGES_KEY = 'badge_states';

interface AchievementStore {
  badges: BadgeState[];
  loaded: boolean;
  load: () => Promise<void>;
  checkAndUnlockBadges: (workout: WorkoutRecord) => Promise<string[]>;
  getBadgesByIds: (ids: string[]) => BadgeDef[];
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

  checkAndUnlockBadges: async (workout) => {
    const stats = useHistoryStore.getState().stats;
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

  getBadgesByIds: (ids) => {
    const earnedMap = new Map(
      get()
        .badges
        .filter((badge) => badge.earned)
        .map((badge) => [badge.id, badge]),
    );

    return ids.flatMap((id) => {
      const def = badgeDefs.find((badge) => badge.id === id);
      return def && earnedMap.has(id) ? [def] : [];
    });
  },
}));
