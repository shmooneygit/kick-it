// Bundled sound assets for each scheme.
// Short WAV clips keep playback simple and reliable in Expo AV.

import { SoundScheme } from '@/lib/types';

export type SoundEvent = 'round' | 'rest' | 'tick' | 'warning' | 'finish';

export type SoundAsset = number;

// Each scheme maps to 4 local WAV assets bundled with the app.
export const soundFiles: Record<SoundScheme, Record<SoundEvent, SoundAsset>> = {
  bell: {
    round: require('../assets/sounds/bell-round.wav'),
    rest: require('../assets/sounds/bell-rest.wav'),
    tick: require('../assets/sounds/bell-tick.wav'),
    warning: require('../assets/sounds/bell-tick.wav'),
    finish: require('../assets/sounds/bell-finish.wav'),
  },
  beep: {
    round: require('../assets/sounds/beep-round.wav'),
    rest: require('../assets/sounds/beep-rest.wav'),
    tick: require('../assets/sounds/beep-tick.wav'),
    warning: require('../assets/sounds/beep-tick.wav'),
    finish: require('../assets/sounds/beep-finish.wav'),
  },
  whistle: {
    round: require('../assets/sounds/whistle-round.wav'),
    rest: require('../assets/sounds/whistle-rest.wav'),
    tick: require('../assets/sounds/whistle-tick.wav'),
    warning: require('../assets/sounds/whistle-tick.wav'),
    finish: require('../assets/sounds/whistle-finish.wav'),
  },
};

export const boxingSoundOverrides: Partial<Record<SoundEvent, SoundAsset>> = {
  round: require('../assets/sounds/bell1.wav'),
  rest: require('../assets/sounds/bell1.wav'),
  warning: require('../assets/sounds/beep1.wav'),
};
