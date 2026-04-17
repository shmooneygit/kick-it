import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import {
  Easing,
  cancelAnimation,
  createAnimatedComponent,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useEffect, useMemo, useRef } from 'react';
import Svg, { Circle } from 'react-native-svg';
import { useSettingsStore } from '@/store/settings-store';
import { TimerPhase, TimerMode } from '@/lib/types';
import { formatTime } from '@/lib/format';
import { t } from '@/lib/i18n';
import { Colors, FontFamily, withOpacity } from '@/constants/theme';

const AnimatedCircle = createAnimatedComponent(Circle);
const AnimatedText = createAnimatedComponent(Text);
const AnimatedView = createAnimatedComponent(View);

type DisplayState = 'countdown' | 'work' | 'rest' | 'warning' | 'finished';

const DISPLAY_STATE_ORDER: DisplayState[] = [
  'countdown',
  'work',
  'rest',
  'warning',
  'finished',
];
const DISPLAY_COLORS = [
  Colors.countdown,
  Colors.work,
  Colors.rest,
  Colors.amber,
  Colors.finished,
];
const DISPLAY_GLOW_COLORS = [
  withOpacity(Colors.countdown, 0.2),
  withOpacity(Colors.work, 0.24),
  withOpacity(Colors.rest, 0.2),
  withOpacity(Colors.amber, 0.22),
  withOpacity(Colors.finished, 0.18),
];

interface TimerDisplayProps {
  secondsRemaining: number;
  phaseRemainingMs: number;
  phase: TimerPhase;
  currentRound: number;
  totalRounds: number;
  totalElapsed: number;
  phaseDurationMs: number;
  mode: TimerMode;
  isPaused: boolean;
}

function getPhaseLabel(
  phase: TimerPhase,
  mode: TimerMode,
  isLastTabataInterval: boolean,
): string {
  if (isLastTabataInterval) {
    return t('timer.last_interval');
  }

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

function getDisplayState(
  phase: TimerPhase,
  secondsRemaining: number,
  isLastTabataInterval: boolean,
): DisplayState {
  if (isLastTabataInterval || (phase === 'work' && secondsRemaining > 0 && secondsRemaining <= 10)) {
    return 'warning';
  }

  return phase;
}

function getDisplayStateIndex(displayState: DisplayState): number {
  return DISPLAY_STATE_ORDER.indexOf(displayState);
}

export function TimerDisplay({
  secondsRemaining,
  phaseRemainingMs,
  phase,
  currentRound,
  totalRounds,
  totalElapsed,
  phaseDurationMs,
  mode,
  isPaused,
}: TimerDisplayProps) {
  const language = useSettingsStore((s) => s.language);
  void isPaused;

  const { width } = useWindowDimensions();
  const isLastTabataInterval =
    mode === 'tabata' &&
    currentRound === totalRounds &&
    (phase === 'work' || phase === 'rest');
  const displayState = getDisplayState(phase, secondsRemaining, isLastTabataInterval);
  const displayStateIndex = getDisplayStateIndex(displayState);
  const isWarningPulseActive = displayState === 'warning' && phase !== 'finished';
  const size = Math.min(width * 0.68, 280);
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(
    phaseDurationMs > 0 ? Math.max(0, phaseRemainingMs / phaseDurationMs) : 0,
  );
  const colorProgress = useSharedValue(displayStateIndex);
  const pulseScale = useSharedValue(1);
  const previousPhaseRef = useRef(phase);

  useEffect(() => {
    colorProgress.value = withTiming(displayStateIndex, {
      duration: 400,
      easing: Easing.inOut(Easing.ease),
    });
  }, [colorProgress, displayStateIndex]);

  useEffect(() => {
    const currentRatio = phaseDurationMs > 0 ? Math.max(0, phaseRemainingMs / phaseDurationMs) : 0;
    const nextWholeSecond = Math.max(secondsRemaining - 1, 0);
    const targetRemainingMs = nextWholeSecond * 1000;
    const durationToNextSecond = Math.max(0, phaseRemainingMs - targetRemainingMs);
    const targetRatio = phaseDurationMs > 0 ? Math.max(0, targetRemainingMs / phaseDurationMs) : 0;

    cancelAnimation(progress);
    progress.value = currentRatio;

    if (phase !== 'finished' && durationToNextSecond > 0) {
      progress.value = withTiming(targetRatio, {
        duration: durationToNextSecond,
        easing: Easing.linear,
      });
    }
  }, [phase, phaseDurationMs, phaseRemainingMs, progress, secondsRemaining]);

  useEffect(() => {
    if (!isWarningPulseActive) {
      cancelAnimation(pulseScale);
      pulseScale.value = 1;
      return;
    }

    cancelAnimation(pulseScale);
    pulseScale.value = 1;
    pulseScale.value = withSequence(
      withTiming(1.03, { duration: 500, easing: Easing.linear }),
      withTiming(1, { duration: 500, easing: Easing.linear }),
    );
  }, [isWarningPulseActive, phase, pulseScale, secondsRemaining]);

  useEffect(() => {
    if (previousPhaseRef.current !== phase) {
      previousPhaseRef.current = phase;
      cancelAnimation(pulseScale);
      pulseScale.value = 1;
    }
  }, [phase, pulseScale]);

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
    stroke: interpolateColor(colorProgress.value, [0, 1, 2, 3, 4], DISPLAY_COLORS),
  }));

  const digitsAnimatedStyle = useAnimatedStyle(() => ({
    color: interpolateColor(colorProgress.value, [0, 1, 2, 3, 4], DISPLAY_COLORS),
    transform: [{ scale: pulseScale.value }],
  }));

  const phaseLabelAnimatedStyle = useAnimatedStyle(() => ({
    color: interpolateColor(colorProgress.value, [0, 1, 2, 3, 4], DISPLAY_COLORS),
  }));

  const ringGlowStyle = useAnimatedStyle(() => ({
    shadowColor: interpolateColor(colorProgress.value, [0, 1, 2, 3, 4], DISPLAY_COLORS),
    shadowOpacity: 0.55,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    backgroundColor: interpolateColor(
      colorProgress.value,
      [0, 1, 2, 3, 4],
      DISPLAY_GLOW_COLORS,
    ),
    transform: [{ scale: pulseScale.value }],
  }));

  const ringAccentStyle = useMemo(
    () => ({
      width: size + 30,
      height: size + 30,
      borderRadius: (size + 30) / 2,
    }),
    [size],
  );

  const renderCounter = () => {
    if (phase === 'rest' && currentRound < totalRounds) {
      const nextRound = currentRound + 1;
      const prefix = mode === 'boxing' ? t('timer.round') : t('timer.work');
      return (
        <Text style={styles.restCounter}>
          {`${language === 'uk' ? 'Далі:' : 'Next:'} ${prefix.toLowerCase()} ${nextRound}`}
        </Text>
      );
    }

    if (phase === 'finished') {
      return null;
    }

    return (
      <Text style={styles.roundCounter}>
        <Text style={styles.roundCounterCurrent}>{currentRound}</Text>
        <Text style={styles.roundCounterTotal}>{` / ${totalRounds}`}</Text>
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      <AnimatedText style={[styles.phaseLabel, phaseLabelAnimatedStyle]}>
        {getPhaseLabel(phase, mode, isLastTabataInterval)}
      </AnimatedText>

      {renderCounter()}

      <View style={[styles.ringContainer, { width: size, height: size }]}>
        <AnimatedView style={[styles.ringGlow, ringAccentStyle, ringGlowStyle]} />

        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={Colors.track}
            strokeWidth={strokeWidth}
            fill="none"
            rotation="-90"
            originX={size / 2}
            originY={size / 2}
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            rotation="-90"
            originX={size / 2}
            originY={size / 2}
            animatedProps={animatedCircleProps}
          />
        </Svg>

        <View style={styles.ringCenter}>
          <AnimatedText style={[styles.digits, digitsAnimatedStyle]}>
            {formatTime(secondsRemaining)}
          </AnimatedText>
        </View>
      </View>

      <Text style={styles.elapsed}>
        {`${t('timer.elapsed')}: ${formatTime(totalElapsed)}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 16,
  },
  phaseLabel: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  roundCounter: {
    marginBottom: 24,
  },
  roundCounterCurrent: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 22,
    color: Colors.textPrimary,
  },
  roundCounterTotal: {
    fontFamily: FontFamily.body,
    fontSize: 22,
    color: Colors.textMuted,
  },
  restCounter: {
    marginBottom: 24,
    fontFamily: FontFamily.body,
    fontSize: 22,
    color: Colors.textMeta,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  ringGlow: {
    position: 'absolute',
  },
  ringCenter: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digits: {
    fontFamily: FontFamily.timerDisplay,
    fontSize: 78,
    letterSpacing: 4,
    color: Colors.green,
    lineHeight: 80,
    textAlign: 'center',
  },
  elapsed: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: Colors.textMuted,
  },
});
