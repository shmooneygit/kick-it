import { useRef, useEffect, useCallback } from 'react';
import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
} from 'expo-av';
import { Asset } from 'expo-asset';
import { SoundScheme, TimerMode } from '@/lib/types';
import {
  getSoundAsset,
  preloadedSoundAssets,
  SoundAsset,
  SoundEvent,
} from '@/lib/sounds';

const KEEP_ALIVE_ASSET = require('../assets/keepalive/silence.wav') as SoundAsset;
let audioModePromise: Promise<void> | null = null;

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

export function useSound(scheme: SoundScheme) {
  const schemeRef = useRef(scheme);
  schemeRef.current = scheme;
  const activeSoundsRef = useRef<Set<Audio.Sound>>(new Set());
  const patternTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const keepAliveSoundRef = useRef<Audio.Sound | null>(null);
  const keepAliveRequestedRef = useRef(false);
  const mountedRef = useRef(true);

  const unloadSound = useCallback((sound: Audio.Sound) => {
    activeSoundsRef.current.delete(sound);
    sound.setOnPlaybackStatusUpdate(null);
    sound.unloadAsync().catch(() => {});
  }, []);

  const playClip = useCallback(
    async (asset: SoundAsset) => {
      await (audioModePromise ?? Promise.resolve());
      const { sound } = await Audio.Sound.createAsync(asset);
      activeSoundsRef.current.add(sound);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          unloadSound(sound);
        }
      });
      await sound.playAsync();
    },
    [unloadSound],
  );

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
      await (audioModePromise ?? Promise.resolve());

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
    void Asset.loadAsync([...preloadedSoundAssets, KEEP_ALIVE_ASSET]);

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
      activeSoundsRef.current.forEach((sound) => unloadSound(sound));
    };
  }, [unloadSound]);

  const queuePattern = useCallback(
    async (asset: SoundAsset, repeat: number) => {
      await playClip(asset);

      for (let index = 1; index < repeat; index += 1) {
        const timeout = setTimeout(() => {
          patternTimeoutsRef.current = patternTimeoutsRef.current.filter(
            (value) => value !== timeout,
          );

          if (mountedRef.current) {
            playClip(asset).catch((error) => {
              console.warn('Sound playback failed:', error);
            });
          }
        }, 150 * index);

        patternTimeoutsRef.current.push(timeout);
      }
    },
    [playClip],
  );

  const play = useCallback(
    async (
      type: SoundEvent,
      options?: { mode?: TimerMode; isLastInterval?: boolean },
    ) => {
      const mode = options?.mode ?? 'boxing';
      const effectiveScheme = mode === 'boxing' ? 'bell' : schemeRef.current;
      const asset = getSoundAsset(mode, type, effectiveScheme);

      if (!asset) {
        return;
      }

      let repeat = 1;

      if (mode === 'tabata') {
        if (type === 'round') {
          repeat = options?.isLastInterval ? 3 : 1;
        } else if (type === 'rest') {
          repeat = 2;
        }
      } else if (type === 'warning') {
        repeat = 2;
      }

      try {
        await queuePattern(asset, repeat);
      } catch (error) {
        console.warn('Sound playback failed:', error);
      }
    },
    [queuePattern],
  );

  return { play, startKeepAlive, stopKeepAlive };
}
