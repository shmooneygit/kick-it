import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRef, useCallback, useEffect } from 'react';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTapRef = useRef(0);
  const lastHapticRef = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const maybeHaptic = useCallback(() => {
    const now = Date.now();
    if (now - lastHapticRef.current >= 150) {
      lastHapticRef.current = now;
      triggerHaptic();
    }
  }, []);

  const doIncrement = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 80) return;
    lastTapRef.current = now;
    const next = Math.min(valueRef.current + step, max);
    if (next !== valueRef.current) {
      onChange(next);
      maybeHaptic();
    }
  }, [step, max, onChange, maybeHaptic]);

  const doDecrement = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 80) return;
    lastTapRef.current = now;
    const next = Math.max(valueRef.current - step, min);
    if (next !== valueRef.current) {
      onChange(next);
      maybeHaptic();
    }
  }, [step, min, onChange, maybeHaptic]);

  const startRepeat = useCallback((action: () => void) => {
    action();
    intervalRef.current = setInterval(action, 150);
  }, []);

  const stopRepeat = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const displayValue = formatValue ? formatValue(value) : String(value);
  const btnSize = compact ? 32 : 40;

  return (
    <View style={compact ? styles.containerCompact : styles.container}>
      {label ? (
        <Text style={compact ? styles.labelCompact : styles.label}>
          {label}
        </Text>
      ) : null}
      <View style={styles.row}>
        <Pressable
          style={[
            styles.button,
            { width: btnSize, height: btnSize, borderRadius: btnSize / 2 },
            value <= min && styles.buttonDisabled,
          ]}
          onPressIn={() => startRepeat(doDecrement)}
          onPressOut={stopRepeat}
          disabled={value <= min}
        >
          <Text style={styles.buttonText}>−</Text>
        </Pressable>
        <View style={compact ? styles.valueContainerCompact : styles.valueContainer}>
          <Text style={compact ? styles.valueCompact : styles.value}>
            {displayValue}
          </Text>
        </View>
        <Pressable
          style={[
            styles.button,
            { width: btnSize, height: btnSize, borderRadius: btnSize / 2 },
            value >= max && styles.buttonDisabled,
          ]}
          onPressIn={() => startRepeat(doIncrement)}
          onPressOut={stopRepeat}
          disabled={value >= max}
        >
          <Text style={styles.buttonText}>+</Text>
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
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  labelCompact: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  button: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.3,
  },
  buttonText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  valueContainer: {
    minWidth: 80,
    alignItems: 'center',
  },
  valueContainerCompact: {
    minWidth: 68,
    alignItems: 'center',
  },
  value: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 22,
    color: Colors.textPrimary,
  },
  valueCompact: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 22,
    color: Colors.textPrimary,
  },
});
