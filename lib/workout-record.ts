import { SessionResult, WorkoutConfig, WorkoutRecord } from './types';

interface BuildWorkoutRecordInput {
  config: WorkoutConfig;
  sessionResult: SessionResult;
  date?: string;
  presetId?: string;
  presetName?: string;
}

export function buildWorkoutRecord({
  config,
  sessionResult,
  date = new Date().toISOString(),
  presetId,
  presetName,
}: BuildWorkoutRecordInput): WorkoutRecord {
  return {
    id: `w_${Date.now()}`,
    date,
    mode: sessionResult.mode,
    config,
    completedRounds: sessionResult.completedRounds,
    totalDuration: sessionResult.totalDuration,
    wasCompleted: sessionResult.wasCompleted,
    ...(presetId ? { presetId } : {}),
    ...(presetName ? { presetName } : {}),
  };
}
