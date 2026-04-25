import { useRef, useEffect, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
} from 'expo-av';
import { Asset } from 'expo-asset';
import { TimerMode } from '@/lib/types';
import {
  getSoundPlayback,
  preloadedSoundAssets,
  SoundAsset,
  SoundPlaybackOptions,
  SoundEvent,
} from '@/lib/sounds';

const KEEP_ALIVE_ASSET = require('../assets/keepalive/silence.wav') as SoundAsset;
const PRELOADED_POOL_SIZE = 4;
const KEEP_ALIVE_HEALTH_CHECK_INTERVAL_MS = 15_000;

const AUDIO_MODE = {
  playsInSilentModeIOS: true,
  staysActiveInBackground: true,
  shouldDuckAndroid: false,
  interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
  interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
  playThroughEarpieceAndroid: false,
};

const POOLED_SOUND_STATUS = {
  shouldPlay: false,
  progressUpdateIntervalMillis: 60000,
};

const KEEP_ALIVE_STATUS = {
  shouldPlay: true,
  isLooping: true,
  volume: 0.01,
  progressUpdateIntervalMillis: 60000,
};

interface SoundPool {
  cursor: number;
  sounds: Audio.Sound[];
}

let audioModePromise: Promise<void> | null = null;
let soundBankPromise: Promise<void> | null = null;
const soundPools = new Map<SoundAsset, SoundPool>();

function configureAudioMode(): Promise<void> {
  if (!audioModePromise) {
    audioModePromise = Audio.setAudioModeAsync(AUDIO_MODE).finally(() => {
      audioModePromise = null;
    });
  }

  return audioModePromise;
}

export function configureAudioModeOnce(): Promise<void> {
  return configureAudioMode();
}

async function createPooledSound(asset: SoundAsset): Promise<Audio.Sound> {
  const { sound } = await Audio.Sound.createAsync(asset, POOLED_SOUND_STATUS);

  return sound;
}

async function createKeepAliveSound(): Promise<Audio.Sound> {
  const { sound } = await Audio.Sound.createAsync(KEEP_ALIVE_ASSET, KEEP_ALIVE_STATUS);

  return sound;
}

async function stopAndUnloadSound(sound: Audio.Sound): Promise<void> {
  try {
    await sound.stopAsync();
  } catch {}

  try {
    await sound.unloadAsync();
  } catch {}
}

async function replacePooledSound(
  asset: SoundAsset,
  pool: SoundPool,
  index: number,
): Promise<Audio.Sound> {
  const staleSound = pool.sounds[index];
  const replacementSound = await createPooledSound(asset);

  pool.sounds[index] = replacementSound;

  if (staleSound) {
    await stopAndUnloadSound(staleSound);
  }

  return replacementSound;
}

async function ensurePooledSoundLoaded(
  asset: SoundAsset,
  pool: SoundPool,
  index: number,
): Promise<Audio.Sound> {
  const sound = pool.sounds[index];

  if (!sound) {
    return replacePooledSound(asset, pool, index);
  }

  try {
    const status = await sound.getStatusAsync();

    if (status.isLoaded) {
      return sound;
    }

    console.warn('Preloaded sound was unloaded; recreating before playback.');
  } catch (error) {
    console.warn('Preloaded sound status check failed; recreating before playback:', error);
  }

  return replacePooledSound(asset, pool, index);
}

async function createSoundPool(asset: SoundAsset): Promise<void> {
  if (soundPools.has(asset)) {
    return;
  }

  const sounds = await Promise.all(
    Array.from({ length: PRELOADED_POOL_SIZE }, () => createPooledSound(asset)),
  );

  soundPools.set(asset, {
    cursor: 0,
    sounds,
  });
}

export function prepareAudioOnce(): Promise<void> {
  if (!soundBankPromise) {
    soundBankPromise = (async () => {
      await configureAudioModeOnce();
      await Asset.loadAsync([...preloadedSoundAssets, KEEP_ALIVE_ASSET]);
      await Promise.all(preloadedSoundAssets.map((asset) => createSoundPool(asset)));
    })().catch((error) => {
      soundBankPromise = null;
      throw error;
    });
  }

  return soundBankPromise;
}

async function playPreloadedAsset(asset: SoundAsset) {
  await prepareAudioOnce();
  await configureAudioMode();

  const pool = soundPools.get(asset);
  if (!pool) {
    throw new Error('Sound pool was not initialized');
  }

  const poolIndex = pool.cursor;
  pool.cursor = (pool.cursor + 1) % pool.sounds.length;
  const sound = await ensurePooledSoundLoaded(asset, pool, poolIndex);

  try {
    await sound.replayAsync();
  } catch (error) {
    console.warn('Sound playback failed; recreating sound before retry:', error);
    const replacementSound = await replacePooledSound(asset, pool, poolIndex);
    await replacementSound.replayAsync();
  }
}

export function useSound() {
  const patternTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const keepAliveSoundRef = useRef<Audio.Sound | null>(null);
  const keepAliveRecoveryPromiseRef = useRef<Promise<void> | null>(null);
  const keepAliveRequestedRef = useRef(false);
  const mountedRef = useRef(true);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const ensureKeepAlivePlaying = useCallback(() => {
    if (!mountedRef.current || !keepAliveRequestedRef.current) {
      return Promise.resolve();
    }

    if (keepAliveRecoveryPromiseRef.current) {
      return keepAliveRecoveryPromiseRef.current;
    }

    const recoveryPromise = (async () => {
      try {
        await prepareAudioOnce();
        await configureAudioMode();

        if (!mountedRef.current || !keepAliveRequestedRef.current) {
          return;
        }

        const existingSound = keepAliveSoundRef.current;

        if (existingSound) {
          try {
            const status = await existingSound.getStatusAsync();

            if (status.isLoaded) {
              if (status.isPlaying) {
                return;
              }

              await existingSound.setStatusAsync(KEEP_ALIVE_STATUS);
              return;
            }

            console.warn('Keep-alive audio was unloaded; recreating loop.');
          } catch (error) {
            console.warn('Keep-alive audio health check failed; recreating loop:', error);
          }

          keepAliveSoundRef.current = null;
          await stopAndUnloadSound(existingSound);
        }

        const sound = await createKeepAliveSound();

        if (!mountedRef.current || !keepAliveRequestedRef.current) {
          await stopAndUnloadSound(sound);
          return;
        }

        keepAliveSoundRef.current = sound;
      } catch (error) {
        console.warn('Keep-alive audio recovery failed:', error);
      }
    })().finally(() => {
      if (keepAliveRecoveryPromiseRef.current === recoveryPromise) {
        keepAliveRecoveryPromiseRef.current = null;
      }
    });

    keepAliveRecoveryPromiseRef.current = recoveryPromise;
    return recoveryPromise;
  }, []);

  const stopKeepAlive = useCallback(async () => {
    keepAliveRequestedRef.current = false;
    const sound = keepAliveSoundRef.current;
    keepAliveSoundRef.current = null;

    if (!sound) return;

    await stopAndUnloadSound(sound);
  }, []);

  const startKeepAlive = useCallback(async () => {
    keepAliveRequestedRef.current = true;

    await ensureKeepAlivePlaying();
  }, [ensureKeepAlivePlaying]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      keepAliveRequestedRef.current = false;
      patternTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      patternTimeoutsRef.current = [];
      const keepAliveSound = keepAliveSoundRef.current;
      keepAliveSoundRef.current = null;
      if (keepAliveSound) {
        stopAndUnloadSound(keepAliveSound).catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (keepAliveRequestedRef.current) {
        void ensureKeepAlivePlaying();
      }
    }, KEEP_ALIVE_HEALTH_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [ensureKeepAlivePlaying]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextAppState) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (nextAppState !== 'active' || previousAppState === 'active') {
        return;
      }

      configureAudioMode().catch((error) => {
        console.warn('Audio session recovery failed:', error);
      });

      if (keepAliveRequestedRef.current) {
        void ensureKeepAlivePlaying();
      }
    });

    return () => sub.remove();
  }, [ensureKeepAlivePlaying]);

  const queuePattern = useCallback(async (asset: SoundAsset, repeat: number) => {
    await playPreloadedAsset(asset);

    for (let index = 1; index < repeat; index += 1) {
      const timeout = setTimeout(() => {
        patternTimeoutsRef.current = patternTimeoutsRef.current.filter(
          (value) => value !== timeout,
        );

        if (mountedRef.current) {
          playPreloadedAsset(asset).catch((error) => {
            console.warn('Sound playback failed:', error);
          });
        }
      }, 150 * index);

      patternTimeoutsRef.current.push(timeout);
    }
  }, []);

  const play = useCallback(
    async (
      type: SoundEvent,
      options: { mode: TimerMode } & SoundPlaybackOptions,
    ) => {
      const { asset, repeat } = getSoundPlayback(options.mode, type, options);

      try {
        if (keepAliveRequestedRef.current) {
          void ensureKeepAlivePlaying();
        }

        await queuePattern(asset, repeat);
      } catch (error) {
        console.warn('Sound playback failed:', error);
      }
    },
    [ensureKeepAlivePlaying, queuePattern],
  );

  return { play, startKeepAlive, stopKeepAlive };
}
