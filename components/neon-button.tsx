import { Pressable, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  Colors,
  FontFamily,
  BorderRadius,
  neonGlow,
} from '@/constants/theme';
import { triggerHaptic } from '@/lib/haptics';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface NeonButtonProps {
  title: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
  fullWidth?: boolean;
}

export function NeonButton({
  title,
  onPress,
  color = Colors.neonCyan,
  disabled = false,
  fullWidth = false,
}: NeonButtonProps) {
  const scale = useSharedValue(1);
  const isPrimaryGreen = color === Colors.green || color === Colors.neonGreen;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96);
    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[
        animatedStyle,
        styles.button,
        { backgroundColor: color },
        isPrimaryGreen && neonGlow(color, 24),
        disabled && styles.disabled,
        fullWidth && styles.fullWidth,
      ]}
    >
      <Text
        style={[
          styles.text,
          isPrimaryGreen ? styles.textPrimaryAction : styles.textSecondaryAction,
        ]}
      >
        {title}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    paddingHorizontal: 24,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: FontFamily.heading,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 3,
  },
  textPrimaryAction: {
    color: Colors.background,
  },
  textSecondaryAction: {
    color: Colors.textPrimary,
  },
});
