import AsyncStorage from '@react-native-async-storage/async-storage';
import { advanceTimerState, getPhaseDurationMs } from './timer-transition';
import { PersistedSession, TimerState } from './types';

const PERSISTED_SESSION_KEY = 'active_workout_session';
const MAX_SESSION_AGE_MS = 2 * 60 * 60 * 1000;

function isPersistedSession(value: unknown): value is PersistedSession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const session = value as Partial<PersistedSession>;

  return (
    (session.programId === null || typeof session.programId === 'string') &&
    typeof session.config === 'object' &&
    (session.phase === 'countdown' || session.phase === 'work' || session.phase === 'rest') &&
    typeof session.currentRound === 'number' &&
    typeof session.totalRounds === 'number' &&
    typeof session.phaseTimeRemainingMs === 'number' &&
    typeof session.totalElapsedMs === 'number' &&
    typeof session.timestamp === 'number' &&
    typeof session.isPaused === 'boolean'
  );
}

function toTimerState(session: PersistedSession, updatedAt: number): TimerState {
  const phaseDurationMs = getPhaseDurationMs(session.config, session.phase);

  return {
    phase: session.phase,
    currentRound: session.currentRound,
    totalRounds: session.totalRounds,
    secondsRemaining: Math.max(0, Math.ceil(session.phaseTimeRemainingMs / 1000)),
    phaseRemainingMs: session.phaseTimeRemainingMs,
    phaseDurationMs,
    totalElapsedSeconds: Math.floor(session.totalElapsedMs / 1000),
    totalElapsedMs: session.totalElapsedMs,
    isPaused: session.isPaused,
    isRunning: true,
    updatedAt,
  };
}

export function createPersistedSession(input: {
  programId: string | null;
  programName?: string;
  timerState: TimerState;
  config: PersistedSession['config'];
}): PersistedSession | null {
  const { timerState, config, programId, programName } = input;
  if (!timerState.isRunning || timerState.phase === 'finished') {
    return null;
  }

  return {
    programId,
    ...(programName ? { programName } : {}),
    config,
    currentRound: timerState.currentRound,
    totalRounds: timerState.totalRounds,
    phaseTimeRemainingMs: timerState.phaseRemainingMs,
    phase: timerState.phase,
    totalElapsedMs: timerState.totalElapsedMs,
    timestamp: Date.now(),
    isPaused: timerState.isPaused,
  };
}

export function resolvePersistedSession(
  session: PersistedSession,
  now: number = Date.now(),
): PersistedSession | null {
  if (session.isPaused) {
    return {
      ...session,
      timestamp: now,
    };
  }

  const baseState = toTimerState(session, session.timestamp);
  const next = advanceTimerState(session.config, baseState, Math.max(0, now - session.timestamp));

  if (next.didFinish || next.phase === 'finished') {
    return null;
  }

  return {
    ...session,
    currentRound: next.currentRound,
    phase: next.phase,
    phaseTimeRemainingMs: next.phaseRemainingMs,
    totalElapsedMs: next.totalElapsedMs,
    timestamp: now,
  };
}

export function restorePersistedTimerState(
  session: PersistedSession,
  now: number = Date.now(),
): TimerState | null {
  const resolved = resolvePersistedSession(session, now);
  if (!resolved) {
    return null;
  }

  return toTimerState(resolved, now);
}

export async function savePersistedSession(session: PersistedSession) {
  await AsyncStorage.setItem(PERSISTED_SESSION_KEY, JSON.stringify(session));
}

export async function clearPersistedSession() {
  await AsyncStorage.removeItem(PERSISTED_SESSION_KEY);
}

export async function loadPersistedSession(): Promise<PersistedSession | null> {
  try {
    const raw = await AsyncStorage.getItem(PERSISTED_SESSION_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isPersistedSession(parsed)) {
      await clearPersistedSession();
      return null;
    }

    const now = Date.now();
    if (now - parsed.timestamp > MAX_SESSION_AGE_MS) {
      await clearPersistedSession();
      return null;
    }

    const resolved = resolvePersistedSession(parsed, now);
    if (!resolved) {
      await clearPersistedSession();
      return null;
    }

    return resolved;
  } catch {
    return null;
  }
}
