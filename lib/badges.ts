import { BadgeDef, WorkoutRecord, UserStats } from './types';

export const badgeDefs: BadgeDef[] = [
  { id: 'first_workout', icon: '🥊', name: { uk: 'Перший раунд', en: 'First Round' }, description: { uk: 'Проведи перше тренування', en: 'Complete your first workout' }, target: 1 },
  { id: 'ten_workouts', icon: '🔟', name: { uk: 'Десятка', en: 'Ten Down' }, description: { uk: '10 тренувань', en: '10 workouts completed' }, target: 10 },
  { id: 'fifty_workouts', icon: '💫', name: { uk: 'Півсотні', en: 'Fifty Strong' }, description: { uk: '50 тренувань', en: '50 workouts completed' }, target: 50 },
  { id: 'hundred_rounds', icon: '💯', name: { uk: 'Сотня', en: 'Century' }, description: { uk: '100 раундів загалом', en: '100 total rounds' }, target: 100 },
  { id: 'five_hundred_rounds', icon: '🏅', name: { uk: "П'ятсот", en: 'Five Hundred' }, description: { uk: '500 раундів загалом', en: '500 total rounds' }, target: 500 },
  { id: 'thousand_rounds', icon: '👑', name: { uk: 'Тисяча', en: 'Thousand' }, description: { uk: '1000 раундів загалом', en: '1000 total rounds' }, target: 1000 },
  { id: 'streak_3', icon: '🔥', name: { uk: 'Розігрівся', en: 'Warming Up' }, description: { uk: 'Серія 3 дні', en: '3-day streak' }, target: 3 },
  { id: 'streak_7', icon: '🔥', name: { uk: 'Тижнева серія', en: 'Week Warrior' }, description: { uk: 'Серія 7 днів', en: '7-day streak' }, target: 7 },
  { id: 'streak_30', icon: '🔥', name: { uk: 'Місячна серія', en: 'Monthly Beast' }, description: { uk: 'Серія 30 днів', en: '30-day streak' }, target: 30 },
  { id: 'early_bird', icon: '🌅', name: { uk: 'Ранній птах', en: 'Early Bird' }, description: { uk: 'Тренування до 7:00', en: 'Workout before 7 AM' } },
  { id: 'night_fighter', icon: '🦇', name: { uk: 'Нічний боєць', en: 'Night Fighter' }, description: { uk: 'Тренування після 22:00', en: 'Workout after 10 PM' } },
  { id: 'marathon', icon: '🏔', name: { uk: 'Марафонець', en: 'Marathoner' }, description: { uk: 'Тренування довше 45 хвилин', en: 'Workout longer than 45 minutes' } },
  { id: 'rocky', icon: '🐯', name: { uk: 'Роккі', en: 'Rocky' }, description: { uk: 'Пройди тренування Роккі повністю', en: 'Complete the Rocky workout' } },
  { id: 'tabata_fan', icon: '⏱️', name: { uk: 'Табата-маніяк', en: 'Tabata Maniac' }, description: { uk: '20 табата-тренувань', en: '20 Tabata workouts' }, target: 20 },
  { id: 'boxing_fan', icon: '🥊', name: { uk: 'Справжній боксер', en: 'True Boxer' }, description: { uk: '20 бокс-тренувань', en: '20 boxing workouts' }, target: 20 },
];

export function checkBadge(
  badgeId: string,
  stats: UserStats,
  workout: WorkoutRecord,
): { earned: boolean; progress?: { current: number; target: number } } {
  const hour = new Date(workout.date).getHours();

  switch (badgeId) {
    case 'first_workout':
      return { earned: stats.totalWorkouts >= 1, progress: { current: stats.totalWorkouts, target: 1 } };
    case 'ten_workouts':
      return { earned: stats.totalWorkouts >= 10, progress: { current: stats.totalWorkouts, target: 10 } };
    case 'fifty_workouts':
      return { earned: stats.totalWorkouts >= 50, progress: { current: stats.totalWorkouts, target: 50 } };
    case 'hundred_rounds':
      return { earned: stats.totalRounds >= 100, progress: { current: stats.totalRounds, target: 100 } };
    case 'five_hundred_rounds':
      return { earned: stats.totalRounds >= 500, progress: { current: stats.totalRounds, target: 500 } };
    case 'thousand_rounds':
      return { earned: stats.totalRounds >= 1000, progress: { current: stats.totalRounds, target: 1000 } };
    case 'streak_3':
      return { earned: stats.currentStreak >= 3, progress: { current: stats.currentStreak, target: 3 } };
    case 'streak_7':
      return { earned: stats.currentStreak >= 7, progress: { current: stats.currentStreak, target: 7 } };
    case 'streak_30':
      return { earned: stats.currentStreak >= 30, progress: { current: stats.currentStreak, target: 30 } };
    case 'early_bird':
      return { earned: hour < 7 };
    case 'night_fighter':
      return { earned: hour >= 22 };
    case 'marathon':
      return { earned: workout.totalDuration >= 2700 };
    case 'rocky':
      return { earned: workout.presetId === 'boxing_rocky' && workout.wasCompleted };
    case 'tabata_fan':
      return { earned: stats.tabataWorkouts >= 20, progress: { current: stats.tabataWorkouts, target: 20 } };
    case 'boxing_fan':
      return { earned: stats.boxingWorkouts >= 20, progress: { current: stats.boxingWorkouts, target: 20 } };
    default:
      return { earned: false };
  }
}
