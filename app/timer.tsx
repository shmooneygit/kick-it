import { AppState, AppStateStatus, View, StyleSheet, Text } from 'react-native';
import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWorkoutStore } from '@/store/workout-store';
import { useHistoryStore } from '@/store/history-store';
import { useAchievementStore } from '@/store/achievement-store';
import { PRESET_STORAGE_KEY } from '@/hooks/use-presets';
import { useTimer } from '@/hooks/use-timer';
import { useSound } from '@/hooks/use-sound';
import { triggerHapticEvent } from '@/lib/haptics';
import {
  clearPersistedSession,
  createPersistedSession,
  restorePersistedTimerState,
  savePersistedSession,
} from '@/lib/session-persistence';
import { ConfirmSheet } from '@/components/confirm-sheet';
import { TimerDisplay } from '@/components/timer-display';
import { ControlButtons } from '@/components/control-buttons';
import { TimerMode, TimerPhase, TimerState, UserPreset, WorkoutConfig } from '@/lib/types';
import { createSessionResult } from '@/lib/session-result';
import { getPresetsForMode } from '@/lib/presets';
import { Colors, FontFamily, withOpacity } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { useSettingsStore } from '@/store/settings-store';
import { formatTime } from '@/lib/format';
import { buildWorkoutRecord } from '@/lib/workout-record';

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

const KEEP_AWAKE_TAG = 'active-session';
const PHASE_ACCENT_COLORS = [
  withOpacity(Colors.countdown, 0.08),
  withOpacity(Colors.work, 0.08),
  withOpacity(Colors.rest, 0.08),
  withOpacity(Colors.amber, 0.08),
  withOpacity(Colors.finished, 0.06),
];

function shouldKeepScreenAwake(state: TimerState): boolean {
  return state.isRunning && !state.isPaused && state.phase !== 'finished';
}

function getPhaseAccentIndex(phase: TimerPhase, isWarning: boolean): number {
  if (isWarning) {
    return 3;
  }

  switch (phase) {
    case 'countdown':
      return 0;
    case 'work':
      return 1;
    case 'rest':
      return 2;
    case 'finished':
      return 4;
  }
}

export default function TimerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const config = useWorkoutStore((s) => s.config);
  const activePresetId = useWorkoutStore((s) => s.activePresetId);
  const setLastResult = useWorkoutStore((s) => s.setLastResult);
  const clearLastResult = useWorkoutStore((s) => s.clearLastResult);
  const setRecoverableSession = useWorkoutStore((s) => s.setRecoverableSession);
  const setPendingResumeSession = useWorkoutStore((s) => s.setPendingResumeSession);
  const language = useSettingsStore((s) => s.language);
  const addWorkout = useHistoryStore((s) => s.addWorkout);
  const checkAndUnlockBadges = useAchievementStore((s) => s.checkAndUnlockBadges);
  const { play, startKeepAlive, stopKeepAlive } = useSound();
  const startedRef = useRef(false);
  const savedRef = useRef(false);
  const savedRouteParamsRef = useRef<{ recordId: string; newBadgeIds?: string } | null>(null);
  const [showStopModal, setShowStopModal] = useState(false);
  const activePresetNameRef = useRef<string | undefined>(undefined);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const previousPhaseRef = useRef<TimerPhase | null>(null);
  const stopModalWasPausedRef = useRef(false);
  const isTabata = config.mode === 'tabata';

  const persistSessionSnapshot = useCallback(
    async (overrideState?: TimerState) => {
      const snapshot = createPersistedSession({
        programId: activePresetId,
        programName: activePresetNameRef.current,
        timerState: overrideState ?? useWorkoutStore.getState().timerState,
        config,
      });

      if (!snapshot) {
        await clearPersistedSession();
        setRecoverableSession(null);
        return;
      }

      await savePersistedSession(snapshot);
    },
    [activePresetId, config, setRecoverableSession],
  );

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

  const onPhaseChange = useCallback(
    (phase: TimerPhase, round: number) => {
      switch (phase) {
        case 'work':
          play('round', {
            mode: config.mode,
            isLastInterval: isTabata && round === config.rounds,
          });
          triggerHapticEvent('roundStart');
          break;
        case 'rest':
          play('rest', { mode: config.mode });
          triggerHapticEvent('roundEnd');
          break;
        case 'countdown':
        case 'finished':
          break;
      }

      void persistSessionSnapshot(useWorkoutStore.getState().timerState);
    },
    [config.mode, config.rounds, isTabata, persistSessionSnapshot, play],
  );

  const onTick = useCallback(
    (secondsRemaining: number, phase: TimerPhase, _round: number) => {
      if (!isTabata && phase === 'work' && secondsRemaining === 10) {
        play('warning', { mode: config.mode });
        triggerHapticEvent('warningStart');
      }

      const shouldPlayFinalTick =
        secondsRemaining <= 3 &&
        secondsRemaining > 0 &&
        (!isTabata || phase === 'countdown' || phase === 'work' || phase === 'rest');

      if (shouldPlayFinalTick) {
        play('tick', { mode: config.mode });
        triggerHapticEvent('warningTick');
      }
    },
    [config.mode, isTabata, play],
  );

  const onFinish = useCallback(() => {
    play('finish', { mode: config.mode });
    void stopKeepAlive();
    void clearPersistedSession();
    setRecoverableSession(null);
    triggerHapticEvent('workoutComplete');
  }, [config.mode, play, setRecoverableSession, stopKeepAlive]);

  const { start, pause, resume, restore, stop, timerState } = useTimer(config, {
    onPhaseChange,
    onTick,
    onFinish,
  });
  const isWarning =
    timerState.phase === 'work' &&
    timerState.secondsRemaining > 0 &&
    timerState.secondsRemaining <= 10;
  const phaseAccentProgress = useSharedValue(
    getPhaseAccentIndex(timerState.phase, isWarning),
  );
  const flashOpacity = useSharedValue(0);
  const screenScale = useSharedValue(0.92);
  const screenOpacity = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;

    getActivePresetName()
      .then((name) => {
        if (!cancelled) {
          activePresetNameRef.current = name;
          if (startedRef.current && useWorkoutStore.getState().timerState.isRunning) {
            void persistSessionSnapshot(useWorkoutStore.getState().timerState);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          activePresetNameRef.current = undefined;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [getActivePresetName, persistSessionSnapshot]);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    clearLastResult();
    startedRef.current = true;

    const pendingResumeSession = useWorkoutStore.getState().pendingResumeSession;
    if (pendingResumeSession) {
      setPendingResumeSession(null);
      const restoredState = restorePersistedTimerState(pendingResumeSession);

      if (restoredState) {
        if (!restoredState.isPaused) {
          void startKeepAlive();
        }
        restore(restoredState);
        void persistSessionSnapshot(restoredState);
        return;
      }

      void clearPersistedSession();
      setRecoverableSession(null);
    }

    void startKeepAlive();
    start();
  }, [
    clearLastResult,
    persistSessionSnapshot,
    restore,
    setPendingResumeSession,
    setRecoverableSession,
    start,
    startKeepAlive,
  ]);

  useEffect(() => {
    screenScale.value = withSpring(1, {
      damping: 16,
      stiffness: 190,
      mass: 0.85,
    });
    screenOpacity.value = withTiming(1, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [screenOpacity, screenScale]);

  useEffect(() => {
    return () => {
      void stopKeepAlive();
    };
  }, [stopKeepAlive]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextAppState) => {
      appStateRef.current = nextAppState;

      if (nextAppState !== 'active') {
        void deactivateKeepAwake(KEEP_AWAKE_TAG);
        return;
      }

      if (shouldKeepScreenAwake(useWorkoutStore.getState().timerState)) {
        void activateKeepAwakeAsync(KEEP_AWAKE_TAG);
      }
    });

    return () => sub.remove();
  }, []);

  useEffect(() => {
    const keepAwakeActive =
      timerState.isRunning && !timerState.isPaused && timerState.phase !== 'finished';

    if (appStateRef.current !== 'active' || !keepAwakeActive) {
      void deactivateKeepAwake(KEEP_AWAKE_TAG);
      return;
    }

    void activateKeepAwakeAsync(KEEP_AWAKE_TAG);
  }, [timerState.isPaused, timerState.isRunning, timerState.phase]);

  useEffect(() => {
    const currentTimerState = useWorkoutStore.getState().timerState;

    if (!startedRef.current) {
      return;
    }

    if (!currentTimerState.isRunning || currentTimerState.phase === 'finished') {
      return;
    }

    void persistSessionSnapshot(currentTimerState);
  }, [
    persistSessionSnapshot,
    timerState.currentRound,
    timerState.isPaused,
    timerState.isRunning,
    timerState.phase,
  ]);

  useEffect(() => {
    phaseAccentProgress.value = withTiming(
      getPhaseAccentIndex(timerState.phase, isWarning),
      {
        duration: 400,
        easing: Easing.inOut(Easing.ease),
      },
    );
  }, [isWarning, phaseAccentProgress, timerState.phase]);

  useEffect(() => {
    if (!startedRef.current) {
      previousPhaseRef.current = timerState.phase;
      return;
    }

    if (previousPhaseRef.current && previousPhaseRef.current !== timerState.phase) {
      flashOpacity.value = 0;
      flashOpacity.value = withSequence(
        withTiming(0.15, { duration: 100, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 100, easing: Easing.in(Easing.quad) }),
      );
    }

    previousPhaseRef.current = timerState.phase;
  }, [flashOpacity, timerState.phase]);

  useEffect(() => {
    return () => {
      void deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, []);

  const handlePauseResume = () => {
    if (timerState.isPaused) {
      void startKeepAlive();
      resume();
    } else {
      pause();
      void stopKeepAlive();
    }
  };

  const backgroundTintStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      phaseAccentProgress.value,
      [0, 1, 2, 3, 4],
      PHASE_ACCENT_COLORS,
    ),
  }));

  const flashOverlayStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const screenEnterStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ scale: screenScale.value }],
  }));

  const saveWorkout = useCallback(
    async (wasCompleted: boolean) => {
      if (savedRef.current) return savedRouteParamsRef.current;
      savedRef.current = true;
      const state = useWorkoutStore.getState().timerState;
      const sessionResult = createSessionResult(state, config.mode, wasCompleted);
      const presetName = await getActivePresetName();
      setLastResult(sessionResult);
      const record = buildWorkoutRecord({
        config,
        sessionResult,
        presetId: activePresetId ?? undefined,
        presetName,
      });
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
    stopModalWasPausedRef.current = timerState.isPaused;
    if (!timerState.isPaused) {
      pause();
    }
    setShowStopModal(true);
  };

  const handleStopDismiss = useCallback(() => {
    setShowStopModal(false);
    if (stopModalWasPausedRef.current) {
      stopModalWasPausedRef.current = false;
      return;
    }

    stopModalWasPausedRef.current = false;
    void startKeepAlive();
    resume();
  }, [resume, startKeepAlive]);

  const handleStopConfirm = useCallback(async () => {
    setShowStopModal(false);
    stopModalWasPausedRef.current = false;
    const routeParams = await saveWorkout(false);
    await clearPersistedSession();
    setRecoverableSession(null);
    await stopKeepAlive();
    stop();
    router.replace({
      pathname: '/result',
      params: routeParams ?? undefined,
    });
  }, [router, saveWorkout, setRecoverableSession, stop, stopKeepAlive]);

  const handleHome = async () => {
    const routeParams = await saveWorkout(true);
    await clearPersistedSession();
    setRecoverableSession(null);
    await stopKeepAlive();
    stop();
    router.replace({
      pathname: '/result',
      params: routeParams ?? undefined,
    });
  };

  const totalRemainingSeconds = useMemo(
    () => getTotalRemainingSeconds(config, timerState),
    [config, timerState],
  );
  const nextPhaseLabel = useMemo(
    () => getNextPhaseLabel(language, config, { phase: timerState.phase, currentRound: timerState.currentRound, mode: config.mode }),
    [config, language, timerState],
  );

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, backgroundTintStyle]}
      />
      <Animated.View pointerEvents="none" style={[styles.flashOverlay, flashOverlayStyle]} />
      <Animated.View style={[styles.screenBody, screenEnterStyle]}>
        <ConfirmSheet
          visible={showStopModal}
          title={t('timer.stopConfirmTitle')}
          subtitle={t('timer.stopSavedHint')}
          confirmLabel={t('timer.stopAction').toUpperCase()}
          cancelLabel={t('timer.continue').toUpperCase()}
          confirmTone="danger"
          onConfirm={() => void handleStopConfirm()}
          onCancel={handleStopDismiss}
        />

        <TimerDisplay
          secondsRemaining={timerState.secondsRemaining}
          phaseRemainingMs={timerState.phaseRemainingMs}
          phase={timerState.phase}
          currentRound={timerState.currentRound}
          totalRounds={timerState.totalRounds}
          totalElapsed={timerState.totalElapsedSeconds}
          phaseDurationMs={timerState.phaseDurationMs}
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
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
  },
  screenBody: {
    flex: 1,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
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
