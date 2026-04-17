import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors, FontFamily, withOpacity } from '@/constants/theme';

interface SessionLockStripProps {
  visible: boolean;
  locked: boolean;
  onUnlock: () => void;
  onLockedPress: () => void;
}

const SWIPE_DISTANCE = 92;

export function SessionLockStrip({
  visible,
  locked,
  onUnlock,
  onLockedPress,
}: SessionLockStripProps) {
  const translateX = useSharedValue(0);
  const hintOpacity = useSharedValue(locked ? 1 : 0);
  const iconScale = useSharedValue(1);
  const containerOpacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    if (!visible) {
      containerOpacity.value = withTiming(0, { duration: 180 });
      return;
    }

    containerOpacity.value = withTiming(1, { duration: 180 });
  }, [containerOpacity, visible]);

  useEffect(() => {
    if (!visible) {
      hintOpacity.value = 0;
      translateX.value = 0;
      return;
    }

    if (!locked) {
      hintOpacity.value = 0;
      translateX.value = withTiming(0, { duration: 180 });
      return;
    }

    hintOpacity.value = 1;
    const timeout = setTimeout(() => {
      hintOpacity.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) });
    }, 3000);

    return () => clearTimeout(timeout);
  }, [hintOpacity, locked, translateX, visible]);

  const handleLockedTap = () => {
    iconScale.value = withSequence(
      withTiming(1.2, { duration: 75 }),
      withTiming(1, { duration: 75 }),
    );
    onLockedPress();
  };

  const swipeGesture = Gesture.Pan()
    .enabled(locked && visible)
    .activeOffsetX([-8, 8])
    .onUpdate((event) => {
      translateX.value = Math.max(-SWIPE_DISTANCE, Math.min(0, event.translationX));
    })
    .onEnd(() => {
      if (Math.abs(translateX.value) >= SWIPE_DISTANCE) {
        translateX.value = withTiming(-SWIPE_DISTANCE, { duration: 120 }, () => {
          runOnJS(onUnlock)();
        });
        return;
      }

      translateX.value = withSpring(0, {
        damping: 14,
        stiffness: 180,
      });
    });

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const handleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { scale: iconScale.value }],
  }));

  const hintStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
  }));

  if (!visible) {
    return null;
  }

  return (
    <Animated.View style={[styles.wrapper, containerStyle]}>
      <Pressable style={styles.track} onPress={locked ? handleLockedTap : undefined}>
        <Animated.Text style={[styles.hint, hintStyle]}>{"<- swipe to unlock"}</Animated.Text>

        <GestureDetector gesture={swipeGesture}>
          <Animated.View style={[styles.handle, handleStyle]}>
            <MaterialIcons
              name={locked ? 'lock' : 'lock-open'}
              size={18}
              color={locked ? Colors.textPrimary : Colors.background}
            />
          </Animated.View>
        </GestureDetector>

        <View style={styles.trackGlow} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 10,
    marginBottom: 4,
  },
  track: {
    minHeight: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: withOpacity(Colors.textPrimary, 0.08),
    backgroundColor: '#12121F',
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 14,
  },
  trackGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: withOpacity(Colors.textPrimary, 0.015),
  },
  hint: {
    position: 'absolute',
    right: 18,
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: '#8D8DAE',
    letterSpacing: 0.4,
  },
  handle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.green,
  },
});
