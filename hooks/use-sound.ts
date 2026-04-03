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
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
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

  useEffect(() => {
    mountedRef.current = true;
    void ensureAudioMode();
    void Asset.loadAsync(Object.values(soundFiles[scheme]));

    return () => {
      mountedRef.current = false;
      warningTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      warningTimeoutsRef.current = [];
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

  return { play };
}
