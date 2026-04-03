import { Pressable, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Colors, FontFamily, FontSize, BorderRadius, neonGlow } from '@/constants/theme';
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
      style={[animatedStyle, disabled && { opacity: 0.5 }, fullWidth && { width: '100%' }]}
    >
      <LinearGradient
        colors={[color, color + '88']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, neonGlow(color, 15)]}
      >
        <Text style={styles.text}>{title}</Text>
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  text: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
