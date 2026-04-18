import { TimerPhase } from '@/lib/types';

export const Colors = {
  surfaceBorder: '#1A1A1A',
  tabBar: '#000000',

  accent: '#39FF14',
  green: '#39FF14',
  pink: '#FF006E',
  amber: '#FFB800',
  purple: '#B24BF3',

  textPrimary: '#FFFFFF',
  textSecondary: '#555555',
  textMuted: '#333333',
  textMeta: '#444444',

  work: '#39FF14',
  rest: '#FF006E',
  countdown: '#FFB800',
  finished: '#39FF14',

  danger: '#FF006E',
  background: '#000000',
  border: '#1A1A1A',
  hairline: '#111111',
  track: '#111111',
  toggleOff: '#1A1A1A',
  toggleThumbOff: '#444444',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 0,
  md: 0,
  lg: 0,
  xl: 0,
  pill: 20,
} as const;

export const FontFamily = {
  timer: 'Orbitron_400Regular',
  timerDisplay: 'BebasNeue',
  heading: 'Orbitron_700Bold',
  body: 'Exo2_400Regular',
  bodySemiBold: 'Exo2_600SemiBold',
  bodyBold: 'Exo2_700Bold',
} as const;

export const FontSize = {
  xs: 11,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
} as const;

export function getPhaseColor(phase: TimerPhase): string {
  const map: Record<TimerPhase, string> = {
    countdown: Colors.countdown,
    work: Colors.work,
    rest: Colors.rest,
    finished: Colors.finished,
  };
  return map[phase];
}

export function withOpacity(hex: string, opacity: number) {
  const value = hex.replace('#', '');
  const normalized = value.length === 3
    ? value.split('').map((char) => char + char).join('')
    : value;
  const num = Number.parseInt(normalized, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
