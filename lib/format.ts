import { t } from '@/lib/i18n';
import { WorkoutConfig, WorkoutRecord } from '@/lib/types';

interface FormatTimeOptions {
  style?: 'clock' | 'summary';
}

export function formatTime(
  seconds: number,
  { style = 'clock' }: FormatTimeOptions = {},
): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  if (style === 'summary') {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}${t('stats.hourShort')} ${remainingMinutes}${t('stats.minuteShort')}`;
    }

    return `${minutes}${t('stats.minuteShort')}`;
  }

  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function formatConfigShorthand(
  input: WorkoutConfig | WorkoutRecord,
): string {
  const config = 'config' in input ? input.config : input;
  return `${config.rounds}×${formatTime(config.workDuration)}`;
}

export function getPresetLabel(
  record?: Pick<WorkoutRecord, 'presetName'> | null,
): string {
  return record?.presetName ?? t('custom_preset');
}
