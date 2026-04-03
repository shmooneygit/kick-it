import { useRef, useEffect, useCallback } from 'react';
import { Audio } from 'expo-av';
import { SoundScheme } from '@/lib/types';
import { soundFiles } from '@/lib/sounds';

type SoundEvent = 'round' | 'rest' | 'tick' | 'finish';

export function useSound(scheme: SoundScheme) {
  const soundsRef = useRef<Record<string, Audio.Sound>>({});
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSounds() {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });

        const assets = soundFiles[scheme];
        for (const [key, asset] of Object.entries(assets)) {
          if (cancelled) return;
          if (asset) {
            const { sound } = await Audio.Sound.createAsync(asset);
            soundsRef.current[key] = sound;
          }
        }
        loadedRef.current = true;
      } catch {
        // Sounds not available — app still works, just silently
      }
    }

    loadSounds();

    return () => {
      cancelled = true;
      Object.values(soundsRef.current).forEach((s) => {
        s.unloadAsync().catch(() => {});
      });
      soundsRef.current = {};
      loadedRef.current = false;
    };
  }, [scheme]);

  const play = useCallback(async (type: SoundEvent) => {
    try {
      const sound = soundsRef.current[type];
      if (sound) {
        await sound.replayAsync();
      }
    } catch {
      // Silently ignore playback errors
    }
  }, []);

  return { play };
}
