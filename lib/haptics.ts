import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '@/store/settings-store';

export function triggerHaptic(
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light,
) {
  if (useSettingsStore.getState().settings.vibrationEnabled) {
    Haptics.impactAsync(style);
  }
}

export function triggerNotification(
  type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success,
) {
  if (useSettingsStore.getState().settings.vibrationEnabled) {
    Haptics.notificationAsync(type);
  }
}
