import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '@/store/settings-store';

export type HapticEvent =
  | 'roundStart'
  | 'roundEnd'
  | 'warningStart'
  | 'warningTick'
  | 'workoutComplete'
  | 'stepper'
  | 'start'
  | 'lockedTap'
  | 'unlock';

type HapticPattern =
  | {
      type: 'impact';
      style: Haptics.ImpactFeedbackStyle;
      repeat?: number;
      intervalMs?: number;
    }
  | {
      type: 'notification';
      notificationType: Haptics.NotificationFeedbackType;
    }
  | {
      type: 'selection';
    };

function resolveImpactStyle(
  style: Haptics.ImpactFeedbackStyle,
  level: 'light' | 'strong',
): Haptics.ImpactFeedbackStyle | 'selection' {
  if (level === 'strong') {
    return style;
  }

  switch (style) {
    case Haptics.ImpactFeedbackStyle.Heavy:
      return Haptics.ImpactFeedbackStyle.Medium;
    case Haptics.ImpactFeedbackStyle.Medium:
      return Haptics.ImpactFeedbackStyle.Light;
    case Haptics.ImpactFeedbackStyle.Light:
      return 'selection';
    case Haptics.ImpactFeedbackStyle.Rigid:
      return Haptics.ImpactFeedbackStyle.Light;
    case Haptics.ImpactFeedbackStyle.Soft:
      return 'selection';
  }
}

function runPattern(pattern: HapticPattern) {
  switch (pattern.type) {
    case 'selection':
      void Haptics.selectionAsync();
      return;
    case 'notification':
      void Haptics.notificationAsync(pattern.notificationType);
      return;
    case 'impact': {
      const repeat = pattern.repeat ?? 1;
      const intervalMs = pattern.intervalMs ?? 0;

      for (let index = 0; index < repeat; index += 1) {
        const trigger = () => {
          void Haptics.impactAsync(pattern.style);
        };

        if (index === 0 || intervalMs === 0) {
          trigger();
        } else {
          setTimeout(trigger, intervalMs * index);
        }
      }
    }
  }
}

function resolvePattern(pattern: HapticPattern): HapticPattern | null {
  const level = useSettingsStore.getState().settings.hapticLevel;
  if (level === 'off') {
    return null;
  }

  if (pattern.type === 'selection') {
    return pattern;
  }

  if (pattern.type === 'notification') {
    return level === 'light' ? { type: 'selection' } : pattern;
  }

  const style = resolveImpactStyle(pattern.style, level);
  if (style === 'selection') {
    return { type: 'selection' };
  }

  return {
    ...pattern,
    style,
  };
}

function triggerPattern(pattern: HapticPattern) {
  const resolved = resolvePattern(pattern);
  if (!resolved) {
    return;
  }

  runPattern(resolved);
}

export function triggerHaptic(
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light,
) {
  triggerPattern({
    type: 'impact',
    style,
  });
}

export function triggerNotification(
  type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success,
) {
  triggerPattern({
    type: 'notification',
    notificationType: type,
  });
}

export function triggerHapticEvent(event: HapticEvent) {
  switch (event) {
    case 'roundStart':
      triggerPattern({
        type: 'impact',
        style: Haptics.ImpactFeedbackStyle.Heavy,
        repeat: 3,
        intervalMs: 100,
      });
      return;
    case 'roundEnd':
      triggerPattern({
        type: 'impact',
        style: Haptics.ImpactFeedbackStyle.Heavy,
      });
      return;
    case 'warningStart':
    case 'warningTick':
    case 'start':
    case 'unlock':
      triggerPattern({
        type: 'impact',
        style: Haptics.ImpactFeedbackStyle.Medium,
      });
      return;
    case 'lockedTap':
      triggerPattern({
        type: 'impact',
        style: Haptics.ImpactFeedbackStyle.Light,
      });
      return;
    case 'workoutComplete':
      triggerPattern({
        type: 'notification',
        notificationType: Haptics.NotificationFeedbackType.Success,
      });
      return;
    case 'stepper':
      triggerPattern({
        type: 'selection',
      });
  }
}
