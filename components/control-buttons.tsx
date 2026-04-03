import { View, Pressable, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
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
  useSettingsStore((s) => s.settings.language);

  const pauseGlow = useSharedValue(0.4);
  const scale = useSharedValue(1);

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
    scale.value = withSpring(1, undefined, () => {});
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
          <MaterialCommunityIcons
            name="home"
            size={24}
            color={Colors.neonCyan}
          />
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
        <MaterialCommunityIcons
          name="stop"
          size={28}
          color={Colors.danger}
        />
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
        <MaterialCommunityIcons
          name={isPaused ? 'play' : 'pause'}
          size={40}
          color={Colors.neonCyan}
        />
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
    borderWidth: 1.5,
    borderColor: Colors.danger + '88',
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
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
  homeText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.lg,
    color: Colors.neonCyan,
  },
});
