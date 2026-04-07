import { SoundScheme, TimerMode } from '@/lib/types';

export type SoundEvent = 'round' | 'rest' | 'tick' | 'warning' | 'finish';

export type SoundAsset = number;

const BELL = require('../assets/sounds/bell1.wav') as SoundAsset;
const BEEP = require('../assets/sounds/beep1.wav') as SoundAsset;

const bellAssets: Record<SoundEvent, SoundAsset> = {
  round: BELL,
  rest: BELL,
  warning: BEEP,
  tick: BEEP,
  finish: BELL,
};

const beepAssets: Record<SoundEvent, SoundAsset> = {
  round: BEEP,
  rest: BEEP,
  warning: BEEP,
  tick: BEEP,
  finish: BEEP,
};

// Placeholder: no whistle audio file exists yet — reusing beep assets
const whistleAssets: Record<SoundEvent, SoundAsset> = {
  round: BEEP,
  rest: BEEP,
  warning: BEEP,
  tick: BEEP,
  finish: BEEP,
};

const schemeMap: Record<SoundScheme, Record<SoundEvent, SoundAsset>> = {
  bell: bellAssets,
  beep: beepAssets,
  whistle: whistleAssets,
};

export const preloadedSoundAssets: SoundAsset[] = [BELL, BEEP];

export function getSoundAsset(
  _mode: TimerMode,
  event: SoundEvent,
  scheme: SoundScheme,
): SoundAsset {
  return schemeMap[scheme][event];
}
