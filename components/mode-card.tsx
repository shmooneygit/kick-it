import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  Colors,
  FontFamily,
  Spacing,
} from '@/constants/theme';
import { triggerHaptic } from '@/lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ModeCardProps {
  title: string;
  description: string;
  emoji: string;
  gradientTo: string;
  onPress: () => void;
  delay?: number;
}

export function ModeCard({
  title,
  description,
  emoji,
  gradientTo,
  onPress,
  delay = 0,
}: ModeCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97);
    triggerHaptic();
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Animated.View style={styles.wrapper} entering={FadeInUp.delay(delay).springify()}>
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[animatedStyle, styles.pressable]}
      >
        <LinearGradient
          colors={[Colors.surface, Colors.surface, gradientTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          <Text style={styles.icon}>{emoji}</Text>
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.description}>{description}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </LinearGradient>
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  pressable: {
    flex: 1,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
  },
  icon: {
    fontSize: 40,
  },
  content: {
    flex: 1,
  },
  title: {
    fontFamily: FontFamily.heading,
    fontSize: 24,
    color: Colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: Spacing.xs,
  },
  description: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chevron: {
    fontFamily: FontFamily.body,
    fontSize: 20,
    color: Colors.textMuted,
  },
});
