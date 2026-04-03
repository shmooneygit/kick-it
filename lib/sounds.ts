// Sound assets for each scheme.
// Place actual .mp3 files in assets/sounds/ directory.
// Files should be short clips (0.5-2 seconds).
// For now, we use a try/catch approach — if files don't exist, sounds simply won't play.

import { SoundScheme } from '@/lib/types';

type SoundEvent = 'round' | 'rest' | 'tick' | 'finish';

type SoundAsset = number;

// Each scheme maps to 4 local WAV assets bundled with the app.
export const soundFiles: Record<SoundScheme, Record<SoundEvent, SoundAsset>> = {
  bell: {
    round: require('../assets/sounds/bell-round.wav'),
    rest: require('../assets/sounds/bell-rest.wav'),
    tick: require('../assets/sounds/bell-tick.wav'),
    finish: require('../assets/sounds/bell-finish.wav'),
  },
  beep: {
    round: require('../assets/sounds/beep-round.wav'),
    rest: require('../assets/sounds/beep-rest.wav'),
    tick: require('../assets/sounds/beep-tick.wav'),
    finish: require('../assets/sounds/beep-finish.wav'),
  },
  whistle: {
    round: require('../assets/sounds/whistle-round.wav'),
    rest: require('../assets/sounds/whistle-rest.wav'),
    tick: require('../assets/sounds/whistle-tick.wav'),
    finish: require('../assets/sounds/whistle-finish.wav'),
  },
};
