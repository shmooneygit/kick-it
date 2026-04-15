import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRef, useCallback, useEffect } from 'react';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { triggerHaptic } from '@/lib/haptics';

interface NumberStepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  compact?: boolean;
}

export function NumberStepper({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  formatValue,
  compact = false,
}: NumberStepperProps) {
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdCountRef = useRef(0);
  const lastHapticRef = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      holdCountRef.current = 0;
    };
  }, []);

  const maybeHaptic = useCallback(() => {
    const now = Date.now();
    if (now - lastHapticRef.current >= 150) {
      lastHapticRef.current = now;
      triggerHaptic();
    }
  }, []);

  const getDelay = useCallback((count: number): number => {
    if (count < 5) return 300;
    if (count < 15) return 150;
    return 80;
  }, []);

  const getNextValue = useCallback(() => {
    if (valueRef.current < min) return min;
    if (step <= 1) return Math.min(valueRef.current + step, max);

    const offset = valueRef.current - min;
    const remainder = offset % step;
    const next =
      remainder === 0
        ? valueRef.current + step
        : valueRef.current + (step - remainder);

    return Math.min(next, max);
  }, [max, min, step]);

  const getPreviousValue = useCallback(() => {
    if (valueRef.current > max) return max;
    if (valueRef.current <= min) return min;
    if (step <= 1) return Math.max(valueRef.current - step, min);

    const offset = valueRef.current - min;
    const remainder = offset % step;
    const next =
      remainder === 0
        ? valueRef.current - step
        : valueRef.current - remainder;

    return Math.max(next, min);
  }, [max, min, step]);

  const doIncrement = useCallback(() => {
    const next = getNextValue();
    if (next !== valueRef.current) {
      onChange(next);
      maybeHaptic();
    }
  }, [getNextValue, onChange, maybeHaptic]);

  const doDecrement = useCallback(() => {
    const next = getPreviousValue();
    if (next !== valueRef.current) {
      onChange(next);
      maybeHaptic();
    }
  }, [getPreviousValue, onChange, maybeHaptic]);

  const stopHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    holdCountRef.current = 0;
  }, []);

  const startHold = useCallback((action: () => void) => {
    action();
    holdCountRef.current = 0;

    const tick = () => {
      action();
      holdCountRef.current += 1;
      holdTimerRef.current = setTimeout(tick, getDelay(holdCountRef.current));
    };

    stopHold();
    holdTimerRef.current = setTimeout(tick, 400);
  }, [getDelay, stopHold]);

  const displayValue = formatValue ? formatValue(value) : String(value);

  return (
    <View style={compact ? styles.containerCompact : styles.container}>
      {label ? <Text style={compact ? styles.labelCompact : styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        <Pressable
          style={[
            styles.buttonTouch,
            value <= min && styles.buttonDisabled,
          ]}
          onPressIn={() => startHold(doDecrement)}
          onPressOut={stopHold}
          disabled={value <= min}
        >
          <View style={[styles.buttonBox, value <= min && styles.buttonBoxDisabled]}>
            <Text style={[styles.buttonText, value <= min && styles.buttonTextDisabled]}>−</Text>
          </View>
        </Pressable>
        <View style={compact ? styles.valueContainerCompact : styles.valueContainer}>
          <Text style={compact ? styles.valueCompact : styles.value}>
            {displayValue}
          </Text>
        </View>
        <Pressable
          style={[
            styles.buttonTouch,
            value >= max && styles.buttonDisabled,
          ]}
          onPressIn={() => startHold(doIncrement)}
          onPressOut={stopHold}
          disabled={value >= max}
        >
          <View style={[styles.buttonBox, value >= max && styles.buttonBoxDisabled]}>
            <Text style={[styles.buttonText, value >= max && styles.buttonTextDisabled]}>+</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.sm,
  },
  containerCompact: {
    marginBottom: 0,
  },
  label: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.textMeta,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  labelCompact: {
    fontFamily: FontFamily.body,
    fontSize: 9,
    color: Colors.textMeta,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  buttonTouch: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonBox: {
    width: 28,
    height: 28,
    borderWidth: 1,
    borderColor: Colors.textMuted,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonBoxDisabled: {
    borderColor: Colors.border,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 16,
    color: Colors.green,
    lineHeight: 18,
  },
  buttonTextDisabled: {
    color: Colors.textMuted,
  },
  valueContainer: {
    minWidth: 74,
    alignItems: 'center',
  },
  valueContainerCompact: {
    minWidth: 64,
    alignItems: 'center',
  },
  value: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  valueCompact: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 17,
    color: Colors.textPrimary,
  },
});
