import { TimerMode } from '@/lib/types';

export type SoundEvent = 'round' | 'rest' | 'tick' | 'warning' | 'finish';

export type SoundAsset = number;
export interface SoundPlaybackOptions {
  isLastInterval?: boolean;
}

const BELL = require('../assets/sounds/bell1.wav') as SoundAsset;
const BEEP = require('../assets/sounds/beep1.wav') as SoundAsset;

type RepeatResolver =
  | number
  | ((options: SoundPlaybackOptions) => number);

interface ModeSoundProfile {
  assets: Record<SoundEvent, SoundAsset>;
  repeats: Partial<Record<SoundEvent, RepeatResolver>>;
}

const boxingSoundProfile: ModeSoundProfile = {
  assets: {
    round: BELL,
    rest: BELL,
    warning: BEEP,
    tick: BEEP,
    finish: BELL,
  },
  repeats: {
    warning: 2,
  },
};

const tabataSoundProfile: ModeSoundProfile = {
  assets: {
    round: BEEP,
    rest: BEEP,
    warning: BEEP,
    tick: BEEP,
    finish: BEEP,
  },
  repeats: {
    round: ({ isLastInterval }) => (isLastInterval ? 3 : 1),
    rest: 2,
  },
};

const modeSoundProfiles: Record<TimerMode, ModeSoundProfile> = {
  boxing: boxingSoundProfile,
  tabata: tabataSoundProfile,
};

export const preloadedSoundAssets: SoundAsset[] = Array.from(
  new Set(
    Object.values(modeSoundProfiles).flatMap((profile) => Object.values(profile.assets)),
  ),
);

function resolveRepeat(
  resolver: RepeatResolver | undefined,
  options: SoundPlaybackOptions,
): number {
  if (typeof resolver === 'function') {
    return resolver(options);
  }

  return resolver ?? 1;
}

export function getSoundPlayback(
  mode: TimerMode,
  event: SoundEvent,
  options: SoundPlaybackOptions = {},
): { asset: SoundAsset; repeat: number } {
  const profile = modeSoundProfiles[mode];

  return {
    asset: profile.assets[event],
    repeat: resolveRepeat(profile.repeats[event], options),
  };
}
