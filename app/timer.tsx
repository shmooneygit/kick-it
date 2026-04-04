import { View, Alert, StyleSheet, Dimensions } from 'react-native';
import { useEffect, useRef, useMemo, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useWorkoutStore } from '@/store/workout-store';
import { useHistoryStore } from '@/store/history-store';
import { useAchievementStore } from '@/store/achievement-store';
import { PRESET_STORAGE_KEY } from '@/hooks/use-presets';
import { useTimer } from '@/hooks/use-timer';
import { useSound } from '@/hooks/use-sound';
import { triggerHaptic, triggerNotification } from '@/lib/haptics';
import * as Haptics from 'expo-haptics';
import { TimerDisplay } from '@/components/timer-display';
import { ControlButtons } from '@/components/control-buttons';
import { TimerPhase, UserPreset } from '@/lib/types';
import { createSessionResult } from '@/lib/session-result';
import { getPresetsForMode } from '@/lib/presets';
import { Colors, getPhaseColor } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { useSettingsStore } from '@/store/settings-store';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function TimerScreen() {
  useKeepAwake();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const config = useWorkoutStore((s) => s.config);
  const activePresetId = useWorkoutStore((s) => s.activePresetId);
  const setLastResult = useWorkoutStore((s) => s.setLastResult);
  const clearLastResult = useWorkoutStore((s) => s.clearLastResult);
  const language = useSettingsStore((s) => s.language);
  const addWorkout = useHistoryStore((s) => s.addWorkout);
  const checkAndUnlockBadges = useAchievementStore((s) => s.checkAndUnlockBadges);
  const { play, startKeepAlive, stopKeepAlive } = useSound(
    config.soundScheme,
  );
  const startedRef = useRef(false);
  const savedRef = useRef(false);
  const savedRouteParamsRef = useRef<{ recordId: string; newBadgeIds?: string } | null>(null);
  const isTabata = config.mode === 'tabata';

  const totalWorkoutSeconds = useMemo(
    () =>
      config.countdownDuration +
      config.rounds * config.workDuration +
      (config.rounds - 1) * config.restDuration,
    [config],
  );

  const progressWidth = useSharedValue(0);
  const progressColor = useSharedValue<string>(Colors.countdown);

  const onPhaseChange = useCallback(
    (phase: TimerPhase, round: number) => {
      progressColor.value = getPhaseColor(phase);
      switch (phase) {
        case 'countdown':
          triggerHaptic();
          break;
        case 'work':
          play('round', {
            mode: config.mode,
            isLastInterval: isTabata && round === config.rounds,
          });
          triggerNotification();
          break;
        case 'rest':
          play('rest', { mode: config.mode });
          triggerNotification(Haptics.NotificationFeedbackType.Warning);
          break;
      }
    },
    [config.mode, config.rounds, isTabata, play, progressColor],
  );

  const onTick = useCallback(
    (secondsRemaining: number, phase: TimerPhase, _round: number) => {
      if (!isTabata && phase === 'work' && secondsRemaining === 10) {
        play('warning');
      }

      const shouldPlayFinalTick =
        secondsRemaining <= 3 &&
        secondsRemaining > 0 &&
        (!isTabata || phase === 'countdown' || phase === 'work' || phase === 'rest');

      if (shouldPlayFinalTick) {
        play('tick');
      }
    },
    [isTabata, play],
  );

  const onFinish = useCallback(() => {
    play('finish');
    void stopKeepAlive();
    triggerNotification();
  }, [play, stopKeepAlive]);

  const { start, pause, resume, stop, timerState } = useTimer(config, {
    onPhaseChange,
    onTick,
    onFinish,
  });

  // Update progress bar
  useEffect(() => {
    if (totalWorkoutSeconds > 0) {
      const pct = Math.min(
        timerState.totalElapsedSeconds / totalWorkoutSeconds,
        1,
      );
      progressWidth.value = withTiming(pct, { duration: 300 });
    }
  }, [timerState.totalElapsedSeconds, totalWorkoutSeconds, progressWidth]);

  // Start timer on mount
  useEffect(() => {
    if (!startedRef.current) {
      clearLastResult();
      startedRef.current = true;
      void startKeepAlive();
      start();
    }
  }, [clearLastResult, start, startKeepAlive]);

  useEffect(() => {
    return () => {
      void stopKeepAlive();
    };
  }, [stopKeepAlive]);

  const handlePauseResume = () => {
    if (timerState.isPaused) {
      resume();
    } else {
      pause();
    }
  };

  const getActivePresetName = useCallback(async () => {
    if (!activePresetId) return undefined;

    const builtInPreset = getPresetsForMode(config.mode).find(
      (preset) => preset.id === activePresetId,
    );
    if (builtInPreset) {
      return builtInPreset.name[language] ?? builtInPreset.name.en;
    }

    try {
      const raw = await AsyncStorage.getItem(PRESET_STORAGE_KEY);
      const userPresets: UserPreset[] = raw ? JSON.parse(raw) : [];
      const activePreset = userPresets.find(
        (preset) => preset.id === activePresetId && preset.mode === config.mode,
      );
      return activePreset?.name?.[language] ?? activePreset?.name?.en;
    } catch {
      return undefined;
    }
  }, [activePresetId, config.mode, language]);

  const saveWorkout = useCallback(
    async (wasCompleted: boolean) => {
      if (savedRef.current) return savedRouteParamsRef.current;
      savedRef.current = true;
      const state = useWorkoutStore.getState().timerState;
      const sessionResult = createSessionResult(state, config.mode, wasCompleted);
      const presetName = await getActivePresetName();
      setLastResult(sessionResult);
      const record = {
        id: `w_${Date.now()}`,
        date: new Date().toISOString(),
        mode: sessionResult.mode,
        config,
        completedRounds: sessionResult.completedRounds,
        totalDuration: sessionResult.totalDuration,
        wasCompleted: sessionResult.wasCompleted,
        presetId: activePresetId ?? undefined,
        presetName,
      };
      await addWorkout(record);
      const newBadgeIds = await checkAndUnlockBadges(record);
      const routeParams = {
        recordId: record.id,
        ...(newBadgeIds.length > 0
          ? { newBadgeIds: JSON.stringify(newBadgeIds) }
          : {}),
      };
      savedRouteParamsRef.current = routeParams;
      return routeParams;
    },
    [activePresetId, addWorkout, checkAndUnlockBadges, config, getActivePresetName, setLastResult],
  );

  const handleStop = () => {
    pause();
    Alert.alert(t('timer.stopConfirmTitle'), t('timer.stopConfirmMessage'), [
      {
        text: t('timer.no'),
        style: 'cancel',
        onPress: () => resume(),
      },
      {
        text: t('timer.yes'),
        style: 'destructive',
        onPress: async () => {
          const routeParams = await saveWorkout(false);
          await stopKeepAlive();
          stop();
          router.replace({
            pathname: '/result',
            params: routeParams ?? undefined,
          });
        },
      },
    ]);
  };

  const handleHome = async () => {
    const routeParams = await saveWorkout(true);
    await stopKeepAlive();
    stop();
    router.replace({
      pathname: '/result',
      params: routeParams ?? undefined,
    });
  };

  const progressBarStyle = useAnimatedStyle(() => ({
    width: progressWidth.value * SCREEN_WIDTH,
    backgroundColor: progressColor.value,
  }));

  const tabataSegments = useMemo(() => {
    if (!isTabata || timerState.totalRounds <= 0) {
      return [];
    }

    const cycleDuration = config.workDuration + config.restDuration;

    return Array.from({ length: timerState.totalRounds }, (_, index) => {
      const segmentRound = index + 1;

      if (timerState.phase === 'finished') {
        return 1;
      }

      if (segmentRound < timerState.currentRound) {
        return 1;
      }

      if (segmentRound > timerState.currentRound) {
        return 0;
      }

      if (timerState.phase === 'countdown' || cycleDuration <= 0) {
        return 0;
      }

      if (timerState.phase === 'work') {
        return Math.max(
          0,
          Math.min(
            1,
            (config.workDuration - timerState.secondsRemaining) / cycleDuration,
          ),
        );
      }

      if (timerState.phase === 'rest') {
        return Math.max(
          0,
          Math.min(
            1,
            (config.workDuration + (config.restDuration - timerState.secondsRemaining)) /
              cycleDuration,
          ),
        );
      }

      return 0;
    });
  }, [
    config.restDuration,
    config.workDuration,
    isTabata,
    timerState.currentRound,
    timerState.phase,
    timerState.secondsRemaining,
    timerState.totalRounds,
  ]);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom + 8 },
      ]}
    >
      {isTabata ? (
        <View style={styles.segmentedTrack}>
          {tabataSegments.map((fill, index) => (
            <View key={index} style={styles.segmentShell}>
              <View
                style={[
                  styles.segmentFill,
                  {
                    width: `${fill * 100}%`,
                    opacity: fill > 0 ? 1 : 0,
                  },
                ]}
              />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressBarStyle]} />
        </View>
      )}

      {/* Timer display */}
      <TimerDisplay
        secondsRemaining={timerState.secondsRemaining}
        phase={timerState.phase}
        currentRound={timerState.currentRound}
        totalRounds={timerState.totalRounds}
        totalElapsed={timerState.totalElapsedSeconds}
        mode={config.mode}
        isPaused={timerState.isPaused}
      />

      {/* Controls */}
      <ControlButtons
        isPaused={timerState.isPaused}
        isFinished={timerState.phase === 'finished'}
        onPauseResume={handlePauseResume}
        onStop={handleStop}
        onHome={handleHome}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 20,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.surfaceLight,
    width: '100%',
    borderRadius: 2,
    marginBottom: 30,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  segmentedTrack: {
    flexDirection: 'row',
    gap: 3,
    width: '100%',
    height: 6,
    marginBottom: 30,
  },
  segmentShell: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  segmentFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.green,
  },
});
