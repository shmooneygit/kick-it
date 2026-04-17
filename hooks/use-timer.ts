import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useWorkoutStore } from '@/store/workout-store';
import { TimerState, WorkoutConfig, TimerPhase } from '@/lib/types';
import { advanceTimerState, getPhaseDurationMs } from '@/lib/timer-transition';

const FRAME_COMMIT_GRANULARITY_MS = 100;

interface UseTimerCallbacks {
  onPhaseChange: (phase: TimerPhase, round: number) => void;
  onTick: (secondsRemaining: number, phase: TimerPhase, round: number) => void;
  onFinish: () => void;
}

function buildStateSnapshot(
  base: TimerState,
  next: ReturnType<typeof advanceTimerState>,
  updatedAt: number,
): TimerState {
  return {
    ...base,
    phase: next.phase,
    currentRound: next.currentRound,
    secondsRemaining: next.secondsRemaining,
    phaseRemainingMs: next.phaseRemainingMs,
    phaseDurationMs: next.phaseDurationMs,
    totalElapsedSeconds: next.totalElapsedSeconds,
    totalElapsedMs: next.totalElapsedMs,
    isPaused: false,
    isRunning: next.isRunning,
    updatedAt,
  };
}

function getCommitBucket(phaseRemainingMs: number): number {
  return Math.floor(Math.max(0, phaseRemainingMs) / FRAME_COMMIT_GRANULARITY_MS);
}

export function useTimer(config: WorkoutConfig, callbacks: UseTimerCallbacks) {
  const timerState = useWorkoutStore((s) => s.timerState);
  const setTimerState = useWorkoutStore((s) => s.setTimerState);
  const resetTimerState = useWorkoutStore((s) => s.resetTimerState);
  const frameRef = useRef<number | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const configRef = useRef(config);
  configRef.current = config;

  const stateRef = useRef(timerState);
  stateRef.current = timerState;

  const runtimeBaseStateRef = useRef<TimerState | null>(null);
  const runtimeStartedAtRef = useRef<number>(0);
  const backgroundStateRef = useRef<TimerState | null>(null);
  const backgroundStartedAtRef = useRef<number | null>(null);
  const lastCommitBucketRef = useRef<number>(-1);
  const lastTickSecondRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const commitState = useCallback(
    (nextState: TimerState) => {
      stateRef.current = nextState;
      setTimerState(nextState);
    },
    [setTimerState],
  );

  const syncRuntime = useCallback((nextState: TimerState, now: number) => {
    runtimeBaseStateRef.current = nextState;
    runtimeStartedAtRef.current = now;
    lastCommitBucketRef.current = getCommitBucket(nextState.phaseRemainingMs);
    lastTickSecondRef.current = nextState.secondsRemaining;
  }, []);

  const readCurrentState = useCallback((now: number) => {
    const runtimeBase = runtimeBaseStateRef.current ?? stateRef.current;

    if (!runtimeBase.isRunning || runtimeBase.isPaused || runtimeBase.phase === 'finished') {
      return {
        nextState: runtimeBase,
        didChangePhase: false,
        didFinish: runtimeBase.phase === 'finished',
      };
    }

    const elapsedMs = Math.max(0, now - runtimeStartedAtRef.current);
    const next = advanceTimerState(configRef.current, runtimeBase, elapsedMs);

    return {
      nextState: buildStateSnapshot(runtimeBase, next, now),
      didChangePhase: next.didChangePhase,
      didFinish: next.didFinish,
    };
  }, []);

  const startTickLoop = useCallback(() => {
    clearTimer();

    const step = () => {
      const current = stateRef.current;
      if (!current.isRunning || current.isPaused || current.phase === 'finished') {
        frameRef.current = null;
        return;
      }

      const now = Date.now();
      const { nextState, didChangePhase, didFinish } = readCurrentState(now);
      const nextBucket = getCommitBucket(nextState.phaseRemainingMs);
      const didChangeSecond = nextState.secondsRemaining !== lastTickSecondRef.current;
      const shouldCommit =
        didChangePhase ||
        didFinish ||
        didChangeSecond ||
        nextBucket !== lastCommitBucketRef.current;

      if (shouldCommit) {
        lastCommitBucketRef.current = nextBucket;
        lastTickSecondRef.current = nextState.secondsRemaining;
        commitState(nextState);
      }

      if (didFinish) {
        syncRuntime(nextState, now);
        callbacksRef.current.onFinish();
        frameRef.current = null;
        return;
      }

      if (didChangePhase) {
        syncRuntime(nextState, now);
        callbacksRef.current.onPhaseChange(nextState.phase, nextState.currentRound);
      } else if (didChangeSecond) {
        callbacksRef.current.onTick(
          nextState.secondsRemaining,
          nextState.phase,
          nextState.currentRound,
        );
      }

      frameRef.current = requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);
  }, [clearTimer, commitState, readCurrentState, syncRuntime]);

  useEffect(() => {
    const handleAppState = (nextAppState: AppStateStatus) => {
      const current = stateRef.current;

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (current.isRunning && !current.isPaused && current.phase !== 'finished') {
          const now = Date.now();
          const { nextState } = readCurrentState(now);

          backgroundStateRef.current = nextState;
          backgroundStartedAtRef.current = now;
          commitState(nextState);
          syncRuntime(nextState, now);
          clearTimer();
        }
        return;
      }

      if (
        nextAppState === 'active' &&
        backgroundStateRef.current &&
        backgroundStartedAtRef.current !== null
      ) {
        const backgroundState = backgroundStateRef.current;
        const elapsedMs = Math.max(0, Date.now() - backgroundStartedAtRef.current);
        const next = advanceTimerState(configRef.current, backgroundState, elapsedMs);
        const now = Date.now();
        const nextState = buildStateSnapshot(backgroundState, next, now);

        commitState(nextState);
        syncRuntime(nextState, now);

        backgroundStateRef.current = null;
        backgroundStartedAtRef.current = null;

        if (next.didFinish) {
          callbacksRef.current.onFinish();
          return;
        }

        if (next.didChangePhase) {
          callbacksRef.current.onPhaseChange(nextState.phase, nextState.currentRound);
        }

        startTickLoop();
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [clearTimer, commitState, readCurrentState, startTickLoop, syncRuntime]);

  const start = useCallback(() => {
    clearTimer();
    resetTimerState();

    const now = Date.now();
    const phaseDurationMs = getPhaseDurationMs(config, 'countdown');
    const nextState: TimerState = {
      phase: 'countdown',
      currentRound: 1,
      totalRounds: config.rounds,
      secondsRemaining: config.countdownDuration,
      phaseRemainingMs: phaseDurationMs,
      phaseDurationMs,
      totalElapsedSeconds: 0,
      totalElapsedMs: 0,
      isPaused: false,
      isRunning: true,
      updatedAt: now,
    };

    commitState(nextState);
    syncRuntime(nextState, now);
    backgroundStateRef.current = null;
    backgroundStartedAtRef.current = null;
    callbacksRef.current.onPhaseChange('countdown', 1);
    startTickLoop();
  }, [clearTimer, commitState, config, resetTimerState, startTickLoop, syncRuntime]);

  const pause = useCallback(() => {
    const current = stateRef.current;
    if (!current.isRunning || current.isPaused || current.phase === 'finished') {
      return;
    }

    const now = Date.now();
    const { nextState } = readCurrentState(now);

    clearTimer();
    const pausedState: TimerState = {
      ...nextState,
      isPaused: true,
      updatedAt: now,
    };

    commitState(pausedState);
    syncRuntime(pausedState, now);
  }, [clearTimer, commitState, readCurrentState, syncRuntime]);

  const resume = useCallback(() => {
    const current = stateRef.current;
    if (!current.isRunning || !current.isPaused || current.phase === 'finished') {
      return;
    }

    const now = Date.now();
    const resumedState: TimerState = {
      ...current,
      isPaused: false,
      updatedAt: now,
    };

    commitState(resumedState);
    syncRuntime(resumedState, now);
    startTickLoop();
  }, [commitState, startTickLoop, syncRuntime]);

  const restore = useCallback(
    (snapshot: TimerState) => {
      clearTimer();

      const now = Date.now();
      const restoredState: TimerState = {
        ...snapshot,
        updatedAt: now,
      };

      commitState(restoredState);
      syncRuntime(restoredState, now);

      if (restoredState.isRunning && !restoredState.isPaused && restoredState.phase !== 'finished') {
        startTickLoop();
      }
    },
    [clearTimer, commitState, startTickLoop, syncRuntime],
  );

  const stop = useCallback(() => {
    clearTimer();
    backgroundStateRef.current = null;
    backgroundStartedAtRef.current = null;
    runtimeBaseStateRef.current = null;
    lastCommitBucketRef.current = -1;
    lastTickSecondRef.current = null;
    resetTimerState();
    stateRef.current = useWorkoutStore.getState().timerState;
  }, [clearTimer, resetTimerState]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return { start, pause, resume, restore, stop, timerState };
}
