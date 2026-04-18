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
  const translateY = useSharedValue(16);

  useEffect(() => {
    if (!visible) {
      overlayOpacity.value = 0;
      translateY.value = 16;
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

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onCancel}>
      <View style={styles.root}>
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onCancel} />
        </Animated.View>

        <Animated.View style={[styles.card, animatedCardStyle]}>
          <Text style={[styles.title, !subtitle && styles.titleWithoutSubtitle]}>{title}</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 0,
    padding: 24,
  },
  title: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  titleWithoutSubtitle: {
    marginBottom: 24,
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: Colors.textMeta,
    marginBottom: 24,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 0,
  },
  primaryButtonDanger: {
    backgroundColor: Colors.pink,
  },
  primaryButtonDefault: {
    backgroundColor: Colors.green,
  },
  primaryButtonText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 14,
    color: Colors.textPrimary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  secondaryButton: {
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 0,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryButtonText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
