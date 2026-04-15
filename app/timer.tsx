import { View, Alert, StyleSheet, Text } from 'react-native';
import { useEffect, useRef, useMemo, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { TimerMode, TimerPhase, TimerState, UserPreset, WorkoutConfig } from '@/lib/types';
import { createSessionResult } from '@/lib/session-result';
import { getPresetsForMode } from '@/lib/presets';
import { Colors, FontFamily } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { useSettingsStore } from '@/store/settings-store';
import { formatTime } from '@/lib/format';

function getPhaseDuration(config: WorkoutConfig, phase: TimerPhase): number {
  switch (phase) {
    case 'countdown':
      return config.countdownDuration;
    case 'work':
      return config.workDuration;
    case 'rest':
      return config.restDuration;
    case 'finished':
      return 0;
  }
}

function getTotalRemainingSeconds(config: WorkoutConfig, timerState: TimerState): number {
  if (timerState.phase === 'finished') {
    return 0;
  }

  if (timerState.phase === 'countdown') {
    return (
      timerState.secondsRemaining +
      config.rounds * config.workDuration +
      Math.max(0, config.rounds - 1) * config.restDuration
    );
  }

  if (timerState.phase === 'work') {
    const futureRounds = Math.max(0, config.rounds - timerState.currentRound);
    const hasRestAfterCurrent = timerState.currentRound < config.rounds ? config.restDuration : 0;
    return (
      timerState.secondsRemaining +
      hasRestAfterCurrent +
      futureRounds * config.workDuration +
      Math.max(0, futureRounds - 1) * config.restDuration
    );
  }

  const futureRounds = Math.max(0, config.rounds - timerState.currentRound);
  return (
    timerState.secondsRemaining +
    futureRounds * config.workDuration +
    Math.max(0, futureRounds - 1) * config.restDuration
  );
}

function getNextPhaseLabel(
  language: 'uk' | 'en',
  config: WorkoutConfig,
  timerState: Pick<TimerState, 'phase' | 'currentRound'> & { mode: TimerMode },
): string {
  const nextPrefix = language === 'uk' ? 'Далі:' : 'Next:';

  if (timerState.phase === 'finished') {
    return `${nextPrefix} ${t('timer.finished')}`;
  }

  if (timerState.phase === 'countdown') {
    const nextName = timerState.mode === 'boxing' ? t('timer.round') : t('timer.work');
    return `${nextPrefix} ${nextName} 1 · ${formatTime(config.workDuration)}`;
  }

  if (timerState.phase === 'work') {
    if (timerState.currentRound >= config.rounds) {
      return `${nextPrefix} ${t('timer.finished')}`;
    }
    return `${nextPrefix} ${t('timer.rest')} ${formatTime(config.restDuration)}`;
  }

  const nextRound = timerState.currentRound + 1;
  const nextName = timerState.mode === 'boxing' ? t('timer.round') : t('timer.work');
  return `${nextPrefix} ${nextName} ${nextRound} · ${formatTime(config.workDuration)}`;
}

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
  const { play, startKeepAlive, stopKeepAlive } = useSound(config.soundScheme);
  const startedRef = useRef(false);
  const savedRef = useRef(false);
  const savedRouteParamsRef = useRef<{ recordId: string; newBadgeIds?: string } | null>(null);
  const isTabata = config.mode === 'tabata';

  const onPhaseChange = useCallback(
    (phase: TimerPhase, round: number) => {
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
    [config.mode, config.rounds, isTabata, play],
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
        ...(newBadgeIds.length > 0 ? { newBadgeIds: JSON.stringify(newBadgeIds) } : {}),
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

  const phaseDuration = useMemo(
    () => getPhaseDuration(config, timerState.phase),
    [config, timerState.phase],
  );
  const totalRemainingSeconds = useMemo(
    () => getTotalRemainingSeconds(config, timerState),
    [config, timerState],
  );
  const nextPhaseLabel = useMemo(
    () => getNextPhaseLabel(language, config, { phase: timerState.phase, currentRound: timerState.currentRound, mode: config.mode }),
    [config, language, timerState],
  );
  const isWarning =
    timerState.phase === 'work' &&
    timerState.secondsRemaining > 0 &&
    timerState.secondsRemaining <= 10;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 },
      ]}
    >
      <TimerDisplay
        secondsRemaining={timerState.secondsRemaining}
        phase={timerState.phase}
        currentRound={timerState.currentRound}
        totalRounds={timerState.totalRounds}
        totalElapsed={timerState.totalElapsedSeconds}
        phaseDuration={phaseDuration}
        mode={config.mode}
        isPaused={timerState.isPaused}
      />

      <ControlButtons
        isPaused={timerState.isPaused}
        isFinished={timerState.phase === 'finished'}
        onPauseResume={handlePauseResume}
        onStop={handleStop}
        onHome={handleHome}
      />

      <View style={styles.infoBar}>
        <Text style={[styles.infoText, styles.infoTextLeft, isWarning && styles.infoAccent]} numberOfLines={1}>
          {nextPhaseLabel}
        </Text>
        <Text style={styles.infoText}>
          {(language === 'uk' ? 'Залиш:' : 'Left:') + ` ${formatTime(totalRemainingSeconds)}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.hairline,
    paddingTop: 10,
  },
  infoText: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.textMuted,
  },
  infoTextLeft: {
    flex: 1,
  },
  infoAccent: {
    color: Colors.amber,
  },
});
