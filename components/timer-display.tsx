import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { createAnimatedComponent, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { useEffect, useRef } from 'react';
import Svg, { Circle } from 'react-native-svg';
import { useSettingsStore } from '@/store/settings-store';
import { TimerPhase, TimerMode } from '@/lib/types';
import { formatTime } from '@/lib/format';
import { t } from '@/lib/i18n';
import {
  Colors,
  FontFamily,
  getPhaseColor,
} from '@/constants/theme';

const AnimatedCircle = createAnimatedComponent(Circle);

interface TimerDisplayProps {
  secondsRemaining: number;
  phase: TimerPhase;
  currentRound: number;
  totalRounds: number;
  totalElapsed: number;
  phaseDuration: number;
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

function getDisplayColor(
  phase: TimerPhase,
  secondsRemaining: number,
  isLastTabataInterval: boolean,
): string {
  if (isLastTabataInterval) {
    return Colors.amber;
  }

  if (phase === 'work' && secondsRemaining > 0 && secondsRemaining <= 10) {
    return Colors.amber;
  }

  return getPhaseColor(phase);
}

export function TimerDisplay({
  secondsRemaining,
  phase,
  currentRound,
  totalRounds,
  totalElapsed,
  phaseDuration,
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
  const phaseColor = getDisplayColor(phase, secondsRemaining, isLastTabataInterval);
  const size = Math.min(width * 0.68, 280);
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const remainingProgress = useSharedValue(
    phaseDuration > 0 ? secondsRemaining / phaseDuration : 0,
  );
  const previousPhaseRef = useRef(phase);

  useEffect(() => {
    if (previousPhaseRef.current !== phase) {
      previousPhaseRef.current = phase;
      remainingProgress.value = phaseDuration > 0 ? Math.max(0, secondsRemaining / phaseDuration) : 0;
      return;
    }

    remainingProgress.value = withTiming(
      phaseDuration > 0 ? Math.max(0, secondsRemaining / phaseDuration) : 0,
      { duration: 900 },
    );
  }, [phase, phaseDuration, remainingProgress, secondsRemaining]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - remainingProgress.value),
  }));

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
      <Text style={[styles.phaseLabel, { color: phaseColor }]}>
        {getPhaseLabel(phase, mode, isLastTabataInterval)}
      </Text>

      {renderCounter()}

      <View style={[styles.ringContainer, { width: size, height: size }]}>
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
            stroke={phaseColor}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            rotation="-90"
            originX={size / 2}
            originY={size / 2}
            animatedProps={animatedProps}
          />
        </Svg>

        <View style={styles.ringCenter}>
          <Text style={[styles.digits, { color: phaseColor }]}>{formatTime(secondsRemaining)}</Text>
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
