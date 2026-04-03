import { useRef, useEffect, useCallback } from 'react';
import {
  Audio,
  InterruptionModeAndroid,
  InterruptionModeIOS,
} from 'expo-av';
import { Asset } from 'expo-asset';
import { SoundScheme } from '@/lib/types';
import { soundFiles, SoundAsset, SoundEvent } from '@/lib/sounds';

export function useSound(scheme: SoundScheme) {
  const activeSoundsRef = useRef<Set<Audio.Sound>>(new Set());
  const warningTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const keepAliveSoundRef = useRef<Audio.Sound | null>(null);
  const keepAliveRequestedRef = useRef(false);
  const mountedRef = useRef(true);
  const audioModePromiseRef = useRef<Promise<void> | null>(null);

  const unloadSound = useCallback((sound: Audio.Sound) => {
    activeSoundsRef.current.delete(sound);
    sound.setOnPlaybackStatusUpdate(null);
    sound.unloadAsync().catch(() => {});
  }, []);

  const ensureAudioMode = useCallback(async () => {
    if (!audioModePromiseRef.current) {
      audioModePromiseRef.current = Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        playThroughEarpieceAndroid: false,
      }).catch((error) => {
        audioModePromiseRef.current = null;
        throw error;
      });
    }

    await audioModePromiseRef.current;
  }, []);

  const playClip = useCallback(
    async (asset: SoundAsset) => {
      await ensureAudioMode();
      const { sound } = await Audio.Sound.createAsync(asset);
      activeSoundsRef.current.add(sound);
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          unloadSound(sound);
        }
      });
      await sound.playAsync();
    },
    [ensureAudioMode, unloadSound],
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
      await ensureAudioMode();

      const asset = soundFiles[scheme].finish;
      const { sound } = await Audio.Sound.createAsync(asset, {
        shouldPlay: true,
        isLooping: true,
        isMuted: true,
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
  }, [ensureAudioMode, scheme]);

  useEffect(() => {
    mountedRef.current = true;
    void ensureAudioMode();
    void Asset.loadAsync(Object.values(soundFiles[scheme]));

    return () => {
      mountedRef.current = false;
      keepAliveRequestedRef.current = false;
      warningTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      warningTimeoutsRef.current = [];
      const keepAliveSound = keepAliveSoundRef.current;
      keepAliveSoundRef.current = null;
      if (keepAliveSound) {
        keepAliveSound.stopAsync().catch(() => {});
        keepAliveSound.unloadAsync().catch(() => {});
      }
      activeSoundsRef.current.forEach((sound) => unloadSound(sound));
    };
  }, [ensureAudioMode, scheme, unloadSound]);

  const play = useCallback(
    async (type: SoundEvent) => {
      const asset = soundFiles[scheme][type];

      try {
        await playClip(asset);

        if (type === 'warning') {
          const timeout = setTimeout(() => {
            warningTimeoutsRef.current = warningTimeoutsRef.current.filter(
              (value) => value !== timeout,
            );

            if (mountedRef.current) {
              playClip(asset).catch((error) => {
                console.warn('Sound playback failed:', error);
              });
            }
          }, 150);

          warningTimeoutsRef.current.push(timeout);
        }
      } catch (error) {
        console.warn('Sound playback failed:', error);
      }
    },
    [playClip, scheme],
  );

  return { play, startKeepAlive, stopKeepAlive };
}
