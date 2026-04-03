export interface LevelInfo {
  name: { uk: string; en: string };
  minRounds: number;
  nextLevel: number;
}

export function getLevel(totalRounds: number): LevelInfo {
  if (totalRounds >= 5000)
    return { name: { uk: 'Легенда', en: 'Legend' }, minRounds: 5000, nextLevel: Infinity };
  if (totalRounds >= 1000)
    return { name: { uk: 'Чемпіон', en: 'Champion' }, minRounds: 1000, nextLevel: 5000 };
  if (totalRounds >= 300)
    return { name: { uk: 'Боєць', en: 'Fighter' }, minRounds: 300, nextLevel: 1000 };
  if (totalRounds >= 50)
    return { name: { uk: 'Аматор', en: 'Amateur' }, minRounds: 50, nextLevel: 300 };
  return { name: { uk: 'Новачок', en: 'Rookie' }, minRounds: 0, nextLevel: 50 };
}
