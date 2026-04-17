import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useWorkoutStore } from '@/store/workout-store';
import { WorkoutConfig, TimerPhase } from '@/lib/types';
import { advanceTimerState, getNextPhase } from '@/lib/timer-transition';

interface UseTimerCallbacks {
  onPhaseChange: (phase: TimerPhase, round: number) => void;
  onTick: (secondsRemaining: number, phase: TimerPhase, round: number) => void;
  onFinish: () => void;
}

export function useTimer(config: WorkoutConfig, callbacks: UseTimerCallbacks) {
  const timerState = useWorkoutStore((s) => s.timerState);
  const setTimerState = useWorkoutStore((s) => s.setTimerState);
  const resetTimerState = useWorkoutStore((s) => s.resetTimerState);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  // Track when app goes to background for drift correction
  const backgroundTimeRef = useRef<number | null>(null);
  const lastTimerUpdateRef = useRef(Date.now());
  const configRef = useRef(config);
  configRef.current = config;

  // Use refs to avoid stale closures in the tick loop
  const stateRef = useRef(timerState);
  stateRef.current = timerState;

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    const state = stateRef.current;
    if (state.isPaused || !state.isRunning || state.phase === 'finished') {
      return;
    }

    const newSeconds = state.secondsRemaining - 1;
    const newElapsed = state.totalElapsedSeconds + 1;
    lastTimerUpdateRef.current = Date.now();

    if (newSeconds <= 0) {
      // Phase transition
      const next = getNextPhase(configRef.current, state.phase, state.currentRound);
      setTimerState({
        phase: next.phase,
        secondsRemaining: next.seconds,
        currentRound: next.round,
        totalElapsedSeconds: newElapsed,
        isRunning: next.phase !== 'finished',
      });

      if (next.phase === 'finished') {
        callbacksRef.current.onFinish();
      } else {
        callbacksRef.current.onPhaseChange(next.phase, next.round);
      }
    } else {
      setTimerState({
        secondsRemaining: newSeconds,
        totalElapsedSeconds: newElapsed,
      });
      callbacksRef.current.onTick(newSeconds, state.phase, state.currentRound);
    }
  }, [setTimerState]);

  // Drift-corrected interval using setTimeout chain
  const startTickLoop = useCallback(() => {
    clearTimer();
    let expected = Date.now() + 1000;

    function step() {
      const state = stateRef.current;
      if (!state.isRunning || state.phase === 'finished' || state.isPaused) {
        timeoutRef.current = null;
        return;
      }

      tick();

      // Drift correction
      const drift = Date.now() - expected;
      expected += 1000;
      const nextDelay = Math.max(0, 1000 - drift);
      timeoutRef.current = setTimeout(step, nextDelay);
    }

    timeoutRef.current = setTimeout(step, 1000);
  }, [clearTimer, tick]);

  // AppState handler for background/foreground
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      const state = stateRef.current;
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimeRef.current = Date.now();
      } else if (nextState === 'active' && backgroundTimeRef.current) {
        // Fast-forward timer by elapsed background time
        if (state.isRunning && !state.isPaused && state.phase !== 'finished') {
          const elapsed = Math.floor((Date.now() - lastTimerUpdateRef.current) / 1000);

          if (elapsed <= 2) {
            backgroundTimeRef.current = null;
            return;
          }

          clearTimer();
          const nextState = advanceTimerState(configRef.current, state, elapsed);

          if (nextState.didFinish) {
            setTimerState({
              phase: 'finished',
              secondsRemaining: 0,
              currentRound: nextState.currentRound,
              totalElapsedSeconds: nextState.totalElapsedSeconds,
              isRunning: false,
            });
            lastTimerUpdateRef.current = Date.now();
            callbacksRef.current.onFinish();
          } else {
            setTimerState({
              phase: nextState.phase,
              secondsRemaining: nextState.secondsRemaining,
              currentRound: nextState.currentRound,
              totalElapsedSeconds: nextState.totalElapsedSeconds,
            });
            lastTimerUpdateRef.current = Date.now();
            if (nextState.didChangePhase) {
              callbacksRef.current.onPhaseChange(nextState.phase, nextState.currentRound);
            }
            startTickLoop();
          }
        }
        backgroundTimeRef.current = null;
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [clearTimer, setTimerState, startTickLoop]);

  const start = useCallback(() => {
    clearTimer();
    resetTimerState();
    setTimerState({
      phase: 'countdown',
      secondsRemaining: config.countdownDuration,
      currentRound: 1,
      totalRounds: config.rounds,
      totalElapsedSeconds: 0,
      isPaused: false,
      isRunning: true,
    });
    lastTimerUpdateRef.current = Date.now();
    callbacksRef.current.onPhaseChange('countdown', 1);
    // Small delay to let state settle before starting tick loop
    setTimeout(() => startTickLoop(), 50);
  }, [clearTimer, config, resetTimerState, setTimerState, startTickLoop]);

  const pause = useCallback(() => {
    clearTimer();
    setTimerState({ isPaused: true });
  }, [clearTimer, setTimerState]);

  const resume = useCallback(() => {
    if (!stateRef.current.isRunning || stateRef.current.phase === 'finished') {
      return;
    }
    setTimerState({ isPaused: false });
    lastTimerUpdateRef.current = Date.now();
    startTickLoop();
  }, [setTimerState, startTickLoop]);

  const stop = useCallback(() => {
    clearTimer();
    lastTimerUpdateRef.current = Date.now();
    resetTimerState();
  }, [clearTimer, resetTimerState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return { start, pause, resume, stop, timerState };
}
