import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useSettingsStore } from '@/store/settings-store';
import { t } from '@/lib/i18n';
import * as Haptics from 'expo-haptics';
import { Colors, FontFamily, FontSize } from '@/constants/theme';
import { triggerHaptic } from '@/lib/haptics';

interface ControlButtonsProps {
  isPaused: boolean;
  isFinished: boolean;
  onPauseResume: () => void;
  onStop: () => void;
  onHome: () => void;
}

export function ControlButtons({
  isPaused,
  isFinished,
  onPauseResume,
  onStop,
  onHome,
}: ControlButtonsProps) {
  useSettingsStore((s) => s.language);
  const pauseAccentColor = isPaused ? Colors.amber : Colors.green;

  const handlePausePress = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
    onPauseResume();
  };

  const handleStopPress = () => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
    onStop();
  };

  if (isFinished) {
    return (
      <View style={styles.container}>
        <Pressable
          style={styles.homeButton}
          onPress={() => {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
            onHome();
          }}
        >
          <Text style={styles.homeText}>{t('timer.backHome')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable style={styles.stopButton} onPress={handleStopPress}>
        <View style={styles.stopGlyph} />
      </Pressable>

      <Pressable
        style={[styles.pauseButton, { borderColor: pauseAccentColor }]}
        onPress={handlePausePress}
      >
        {isPaused ? (
          <View style={[styles.playGlyph, { borderLeftColor: pauseAccentColor }]} />
        ) : (
          <View style={styles.pauseGlyph}>
            <View style={[styles.pauseBar, { backgroundColor: pauseAccentColor }]} />
            <View style={[styles.pauseBar, { backgroundColor: pauseAccentColor }]} />
          </View>
        )}
      </Pressable>

      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingVertical: 18,
  },
  pauseButton: {
    width: 72,
    height: 72,
    borderWidth: 2,
    borderColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    width: 52,
    height: 52,
    borderWidth: 2,
    borderColor: Colors.pink,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopGlyph: {
    width: 16,
    height: 16,
    backgroundColor: Colors.pink,
  },
  spacer: {
    width: 52,
  },
  homeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 54,
    backgroundColor: Colors.green,
  },
  homeText: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.md,
    color: Colors.background,
    letterSpacing: 3,
  },
  pauseGlyph: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pauseBar: {
    width: 5,
    height: 22,
    backgroundColor: Colors.green,
  },
  playGlyph: {
    width: 0,
    height: 0,
    marginLeft: 4,
    borderTopWidth: 12,
    borderBottomWidth: 12,
    borderLeftWidth: 20,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: Colors.green,
  },
});
