import { TimerPhase } from '@/lib/types';

export const Colors = {
  bg: '#0A0A0F',
  surface: '#12121C',
  surfaceLight: '#1A1A2E',
  surfaceBorder: '#252540',
  tabBar: '#0D0D15',

  cyan: '#00F5FF',
  green: '#39FF14',
  pink: '#FF006E',
  amber: '#FFB800',
  purple: '#B24BF3',

  textPrimary: '#FFFFFF',
  textSecondary: '#8888AA',
  textMuted: '#555577',

  work: '#39FF14',
  rest: '#FF006E',
  countdown: '#FFB800',
  finished: '#00F5FF',

  danger: '#FF006E',

  // Aliases used by components
  neonGreen: '#39FF14',
  neonCyan: '#00F5FF',
  neonAmber: '#FFB800',
  background: '#0A0A0F',
  border: '#252540',
  surfaceGlass: 'rgba(26,26,46,0.7)',
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
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  pill: 20,
} as const;

export const BorderRadius = Radius;

export const FontFamily = {
  timer: 'Orbitron_400Regular',
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
  timer: 96,
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

export function glow(color: string, radius = 10) {
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 } as const,
    shadowOpacity: 0.25,
    shadowRadius: radius,
    elevation: radius,
  };
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

export const neonGlow = glow;
