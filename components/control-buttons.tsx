import { View, Pressable, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settings-store';
import { t } from '@/lib/i18n';
import * as Haptics from 'expo-haptics';
import { Colors, FontFamily, FontSize, Spacing, neonGlow } from '@/constants/theme';
import { triggerHaptic } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

  const pauseGlow = useSharedValue(0.4);

  useEffect(() => {
    if (isPaused) {
      pauseGlow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0.4, { duration: 600 }),
        ),
        -1,
        false,
      );
    } else {
      pauseGlow.value = withTiming(0.4, { duration: 200 });
    }
  }, [isPaused, pauseGlow]);

  const pauseGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: pauseGlow.value,
  }));

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
          style={[styles.homeButton, neonGlow(Colors.neonCyan, 12)]}
          onPress={() => {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
            onHome();
          }}
        >
          <Text style={styles.homeEmoji}>🏠</Text>
          <Text style={styles.homeText}>{t('timer.backHome')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stop button */}
      <Pressable
        style={[styles.stopButton, neonGlow(Colors.danger, 8)]}
        onPress={handleStopPress}
      >
        <View style={styles.stopGlyph} />
      </Pressable>

      {/* Pause / Resume button */}
      <AnimatedPressable
        style={[
          styles.pauseButton,
          neonGlow(Colors.neonCyan, 15),
          pauseGlowStyle,
        ]}
        onPress={handlePausePress}
      >
        {isPaused ? (
          <View style={styles.playGlyph} />
        ) : (
          <View style={styles.pauseGlyph}>
            <View style={styles.pauseBar} />
            <View style={styles.pauseBar} />
          </View>
        )}
      </AnimatedPressable>

      {/* Spacer for symmetry */}
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  pauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.neonCyan,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: Colors.pink,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopGlyph: {
    width: 20,
    height: 20,
    borderRadius: 3,
    backgroundColor: Colors.pink,
  },
  spacer: {
    width: 60,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.neonCyan,
    backgroundColor: Colors.surface,
  },
  homeEmoji: {
    fontSize: 20,
  },
  homeText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.neonCyan,
  },
  pauseGlyph: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pauseBar: {
    width: 6,
    height: 24,
    borderRadius: 4,
    backgroundColor: Colors.neonCyan,
  },
  playGlyph: {
    width: 0,
    height: 0,
    marginLeft: 6,
    borderTopWidth: 14,
    borderBottomWidth: 14,
    borderLeftWidth: 22,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: Colors.neonCyan,
  },
});
