import { View, Alert, StyleSheet, Dimensions } from 'react-native';
import { useEffect, useRef, useMemo, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Href } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
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
import { TimerPhase } from '@/lib/types';
import { createSessionResult } from '@/lib/session-result';
import { Colors, getPhaseColor } from '@/constants/theme';
import { t } from '@/lib/i18n';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function TimerScreen() {
  useKeepAwake();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const config = useWorkoutStore((s) => s.config);
  const activePresetId = useWorkoutStore((s) => s.activePresetId);
  const setLastResult = useWorkoutStore((s) => s.setLastResult);
  const clearLastResult = useWorkoutStore((s) => s.clearLastResult);
  const addWorkout = useHistoryStore((s) => s.addWorkout);
  const evaluateBadges = useAchievementStore((s) => s.evaluateAfterWorkout);
  const { play } = useSound(config.soundScheme);
  const startedRef = useRef(false);
  const savedRef = useRef(false);

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
    (secondsRemaining: number) => {
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

  const saveWorkout = useCallback(
    async (wasCompleted: boolean) => {
      if (savedRef.current) return;
      savedRef.current = true;
      const state = useWorkoutStore.getState().timerState;
      const sessionResult = createSessionResult(state, config.mode, wasCompleted);
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
      };
      await addWorkout(record);
      const stats = useHistoryStore.getState().stats;
      await evaluateBadges(stats, record);
    },
    [activePresetId, addWorkout, config, evaluateBadges, setLastResult],
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
          await saveWorkout(false);
          stop();
          router.replace('/result' as Href);
        },
      },
    ]);
  };

  const handleHome = async () => {
    await saveWorkout(true);
    stop();
    router.replace('/result' as Href);
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
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.surfaceBorder,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
