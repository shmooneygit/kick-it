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
      return mode === 'boxing' ? t('timer.round') : t('timer.work');
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

    const isLast10 = secondsRemaining <= 10 && secondsRemaining > 0;
    const scaleTarget = isLast10 ? 1.03 : 1;
    const duration = isLast10 ? 220 : 180;

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
  let progressLabel: string | null = null;

  if (phase === 'work') {
    progressLabel = isBoxing
      ? `${currentRound} ${t('timer.roundOf')} ${totalRounds}`
      : `${currentRound} ${t('timer.intervalOf')} ${totalRounds}`;
  } else if (phase === 'rest' && currentRound < totalRounds) {
    progressLabel = isBoxing
      ? `${t('timer.round')} ${currentRound + 1}`
      : `${t('timer.work')} ${currentRound + 1}`;
  }

  return (
    <View style={styles.container}>
      {/* Phase label */}
      <Text style={[styles.phaseLabel, { color: phaseColor }]}>
        {getPhaseLabel(phase, mode, currentRound)}
      </Text>

      {/* Progress info */}
      {progressLabel && (
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
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  progress: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 20,
    color: Colors.textSecondary,
    marginBottom: 40,
  },
  digits: {
    fontFamily: FontFamily.timer,
    fontSize: FontSize.timer,
    fontWeight: '400',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  elapsed: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 30,
  },
});
