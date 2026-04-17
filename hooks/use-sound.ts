import { useRef, useEffect, useCallback } from 'react';
import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
} from 'expo-av';
import { Asset } from 'expo-asset';
import { TimerMode } from '@/lib/types';
import {
  getModePreviewAsset,
  getSoundPlayback,
  preloadedSoundAssets,
  SoundAsset,
  SoundPlaybackOptions,
  SoundEvent,
} from '@/lib/sounds';

const KEEP_ALIVE_ASSET = require('../assets/keepalive/silence.wav') as SoundAsset;
const PRELOADED_POOL_SIZE = 4;

interface SoundPool {
  cursor: number;
  sounds: Audio.Sound[];
}

let audioModePromise: Promise<void> | null = null;
let soundBankPromise: Promise<void> | null = null;
const soundPools = new Map<SoundAsset, SoundPool>();

export function configureAudioModeOnce(): Promise<void> {
  if (!audioModePromise) {
    audioModePromise = Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: false,
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      playThroughEarpieceAndroid: false,
    }).catch((error) => {
      audioModePromise = null;
      throw error;
    });
  }

  return audioModePromise;
}

async function createSoundPool(asset: SoundAsset): Promise<void> {
  if (soundPools.has(asset)) {
    return;
  }

  const sounds = await Promise.all(
    Array.from({ length: PRELOADED_POOL_SIZE }, async () => {
      const { sound } = await Audio.Sound.createAsync(asset, {
        shouldPlay: false,
        progressUpdateIntervalMillis: 60000,
      });

      return sound;
    }),
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

  const pool = soundPools.get(asset);
  if (!pool) {
    throw new Error('Sound pool was not initialized');
  }

  const sound = pool.sounds[pool.cursor];
  pool.cursor = (pool.cursor + 1) % pool.sounds.length;

  await sound.replayAsync();
}

export function useSound() {
  const patternTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const keepAliveSoundRef = useRef<Audio.Sound | null>(null);
  const keepAliveRequestedRef = useRef(false);
  const mountedRef = useRef(true);

  const stopKeepAlive = useCallback(async () => {
    keepAliveRequestedRef.current = false;
    const sound = keepAliveSoundRef.current;
    keepAliveSoundRef.current = null;

    if (!sound) return;

    try {
      await sound.stopAsync();
    } catch {}

    try {
      await sound.unloadAsync();
    } catch {}
  }, []);

  const startKeepAlive = useCallback(async () => {
    keepAliveRequestedRef.current = true;

    if (keepAliveSoundRef.current) return;

    try {
      await prepareAudioOnce();

      const { sound } = await Audio.Sound.createAsync(KEEP_ALIVE_ASSET, {
        shouldPlay: true,
        isLooping: true,
        volume: 0.01,
        progressUpdateIntervalMillis: 60000,
      });

      if (!mountedRef.current || !keepAliveRequestedRef.current) {
        await sound.unloadAsync().catch(() => {});
        return;
      }

      keepAliveSoundRef.current = sound;
    } catch (error) {
      keepAliveRequestedRef.current = false;
      console.warn('Keep-alive audio failed:', error);
    }
  }, []);

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
        keepAliveSound.stopAsync().catch(() => {});
        keepAliveSound.unloadAsync().catch(() => {});
      }
    };
  }, []);

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
        await queuePattern(asset, repeat);
      } catch (error) {
        console.warn('Sound playback failed:', error);
      }
    },
    [queuePattern],
  );

  const previewMode = useCallback(
    async (mode: TimerMode) => {
      const asset = getModePreviewAsset(mode);

      try {
        await playPreloadedAsset(asset);
      } catch (error) {
        console.warn('Sound preview failed:', error);
        throw error;
      }
    },
    [],
  );

  return { play, previewMode, startKeepAlive, stopKeepAlive };
}
