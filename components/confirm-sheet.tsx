import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors, FontFamily } from '@/constants/theme';

interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmTone?: 'danger' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({
  visible,
  title,
  subtitle,
  confirmLabel,
  cancelLabel,
  confirmTone = 'default',
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  const overlayOpacity = useSharedValue(0);
  const translateY = useSharedValue(48);

  useEffect(() => {
    if (!visible) {
      overlayOpacity.value = 0;
      translateY.value = 48;
      return;
    }

    overlayOpacity.value = withTiming(1, {
      duration: 180,
      easing: Easing.out(Easing.quad),
    });
    translateY.value = withSpring(0, {
      damping: 18,
      stiffness: 180,
      mass: 0.85,
    });
  }, [overlayOpacity, translateY, visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onCancel}>
      <View style={styles.root}>
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onCancel} />
        </Animated.View>

        <Animated.View style={[styles.card, cardStyle]}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          <Pressable
            style={[
              styles.primaryButton,
              confirmTone === 'danger' ? styles.primaryButtonDanger : styles.primaryButtonDefault,
            ]}
            onPress={onConfirm}
          >
            <Text style={styles.primaryButtonText}>{confirmLabel}</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={onCancel}>
            <Text style={styles.secondaryButtonText}>{cancelLabel}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 8, 16, 0.8)',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2A2A3F',
    backgroundColor: '#12121F',
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 18,
  },
  title: {
    fontFamily: FontFamily.heading,
    fontSize: 22,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 18,
    fontFamily: FontFamily.body,
    fontSize: 14,
    color: '#7B7B9A',
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryButtonDanger: {
    backgroundColor: '#FF2D2D',
  },
  primaryButtonDefault: {
    backgroundColor: Colors.green,
  },
  primaryButtonText: {
    fontFamily: FontFamily.heading,
    fontSize: 18,
    color: Colors.textPrimary,
    letterSpacing: 1.2,
  },
  secondaryButton: {
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A2A3F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
    letterSpacing: 0.6,
  },
});
