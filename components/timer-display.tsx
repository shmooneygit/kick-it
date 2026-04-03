import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settings-store';
import { TimerPhase, TimerMode } from '@/lib/types';
import { t } from '@/lib/i18n';
import {
  Colors,
  FontFamily,
  FontSize,
  Spacing,
  getPhaseColor,
  neonGlow,
} from '@/constants/theme';

interface TimerDisplayProps {
  secondsRemaining: number;
  phase: TimerPhase;
  currentRound: number;
  totalRounds: number;
  totalElapsed: number;
  mode: TimerMode;
  isPaused: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getPhaseLabel(phase: TimerPhase, mode: TimerMode, round: number): string {
  switch (phase) {
    case 'countdown':
      return t('timer.preparation');
    case 'work':
      return mode === 'boxing'
        ? `${t('timer.round')} ${round}`
        : `${t('timer.work')} ${round}`;
    case 'rest':
      return t('timer.rest');
    case 'finished':
      return t('timer.finished');
  }
}

export function TimerDisplay({
  secondsRemaining,
  phase,
  currentRound,
  totalRounds,
  totalElapsed,
  mode,
  isPaused,
}: TimerDisplayProps) {
  useSettingsStore((s) => s.settings.language);

  const phaseColor = getPhaseColor(phase);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Pulse animation on each second
  useEffect(() => {
    if (phase === 'finished') return;

    const isLast3 = secondsRemaining <= 3 && secondsRemaining > 0;
    const scaleTarget = isLast3 ? 1.12 : 1.04;
    const duration = isLast3 ? 150 : 100;

    scale.value = withSequence(
      withTiming(scaleTarget, { duration }),
      withTiming(1, { duration }),
    );
  }, [secondsRemaining, phase, scale]);

  // Blinking when paused
  useEffect(() => {
    if (isPaused) {
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 500 }),
          withTiming(1, { duration: 500 }),
        ),
        -1,
        false,
      );
      return () => {
        opacity.value = withTiming(1, { duration: 200 });
      };
    } else {
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [isPaused, opacity]);

  const animatedDigitStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const isBoxing = mode === 'boxing';
  const progressLabel = isBoxing
    ? `${t('timer.round')} ${currentRound} ${t('timer.roundOf')} ${totalRounds}`
    : `${t('timer.work')} ${currentRound} ${t('timer.intervalOf')} ${totalRounds}`;

  return (
    <View style={styles.container}>
      {/* Phase label */}
      <Text style={[styles.phaseLabel, { color: phaseColor }]}>
        {getPhaseLabel(phase, mode, currentRound)}
      </Text>

      {/* Progress info */}
      {phase !== 'countdown' && phase !== 'finished' && (
        <Text style={styles.progress}>{progressLabel}</Text>
      )}

      {/* Main countdown */}
      <Animated.View style={animatedDigitStyle}>
        <Text
          style={[
            styles.digits,
            { color: phaseColor },
            neonGlow(phaseColor, 25),
          ]}
        >
          {formatTime(secondsRemaining)}
        </Text>
      </Animated.View>

      {/* Total elapsed */}
      <Text style={styles.elapsed}>
        {t('timer.elapsed')}: {formatTime(totalElapsed)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  phaseLabel: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.xl,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: Spacing.xs,
  },
  progress: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  digits: {
    fontFamily: FontFamily.timer,
    fontSize: FontSize.timer,
    fontWeight: '700',
    letterSpacing: 4,
  },
  elapsed: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.lg,
  },
});
