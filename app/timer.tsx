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
const PRESET_STORAGE_KEY = 'workout_presets_v2';

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
  const { play } = useSound(config.soundScheme);
  const startedRef = useRef(false);
  const savedRef = useRef(false);
  const savedRouteParamsRef = useRef<{ recordId: string; newBadgeIds?: string } | null>(null);

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
    (phase: TimerPhase, _round: number) => {
      progressColor.value = getPhaseColor(phase);
      switch (phase) {
        case 'countdown':
          triggerHaptic();
          break;
        case 'work':
          play('round');
          triggerNotification();
          break;
        case 'rest':
          play('rest');
          triggerNotification(Haptics.NotificationFeedbackType.Warning);
          break;
      }
    },
    [play, progressColor],
  );

  const onTick = useCallback(
    (secondsRemaining: number, phase: TimerPhase) => {
      if (phase === 'work' && secondsRemaining === 10) {
        play('warning');
      }

      if (secondsRemaining <= 3 && secondsRemaining > 0) {
        play('tick');
      }
    },
    [play],
  );

  const onFinish = useCallback(() => {
    play('finish');
    triggerNotification();
  }, [play]);

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
      start();
    }
  }, [clearLastResult, start]);

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

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom + 8 },
      ]}
    >
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, progressBarStyle]} />
      </View>

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
});
