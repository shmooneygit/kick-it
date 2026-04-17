import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clearPersistedSession } from '@/lib/session-persistence';
import { formatConfigShorthand } from '@/lib/format';
import { t } from '@/lib/i18n';
import { Colors, FontFamily } from '@/constants/theme';
import { useWorkoutStore } from '@/store/workout-store';

export function ResumeWorkoutBanner() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const recoverableSession = useWorkoutStore((s) => s.recoverableSession);
  const loadConfig = useWorkoutStore((s) => s.loadConfig);
  const setRecoverableSession = useWorkoutStore((s) => s.setRecoverableSession);
  const setPendingResumeSession = useWorkoutStore((s) => s.setPendingResumeSession);
  const [hiddenSessionTimestamp, setHiddenSessionTimestamp] = useState<number | null>(null);
  const translateY = useSharedValue(-140);
  const opacity = useSharedValue(0);

  const isVisible =
    !!recoverableSession &&
    recoverableSession.timestamp !== hiddenSessionTimestamp;

  useEffect(() => {
    if (!isVisible) {
      translateY.value = -140;
      opacity.value = 0;
      return;
    }

    translateY.value = withSpring(0, {
      damping: 17,
      stiffness: 170,
      mass: 0.8,
    });
    opacity.value = withTiming(1, {
      duration: 180,
      easing: Easing.out(Easing.quad),
    });

    const timeout = setTimeout(() => {
      if (recoverableSession) {
        setHiddenSessionTimestamp(recoverableSession.timestamp);
      }
    }, 8000);

    return () => clearTimeout(timeout);
  }, [isVisible, opacity, recoverableSession, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const subtitle = useMemo(() => {
    if (!recoverableSession) {
      return '';
    }

    return recoverableSession.programName ?? formatConfigShorthand(recoverableSession.config);
  }, [recoverableSession]);

  if (!recoverableSession || !isVisible) {
    return null;
  }

  const handleDiscard = async () => {
    setHiddenSessionTimestamp(recoverableSession.timestamp);
    setPendingResumeSession(null);
    setRecoverableSession(null);
    await clearPersistedSession();
  };

  const handleResume = () => {
    setHiddenSessionTimestamp(recoverableSession.timestamp);
    loadConfig(recoverableSession.config, recoverableSession.programId);
    setPendingResumeSession(recoverableSession);
    setRecoverableSession(null);
    router.replace('/timer');
  };

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrapper, { paddingTop: insets.top + 4 }, animatedStyle]}
    >
      <View style={styles.banner}>
        <View style={styles.copy}>
          <Text style={styles.title}>{t('timer.resumeLastWorkout')}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable style={[styles.button, styles.primaryButton]} onPress={handleResume}>
            <Text style={[styles.buttonText, styles.primaryButtonText]}>{t('timer.yes')}</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={() => void handleDiscard()}>
            <Text style={styles.buttonText}>{t('timer.discard')}</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30,
    paddingHorizontal: 12,
  },
  banner: {
    backgroundColor: '#1C1C2E',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A3F',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  copy: {
    marginBottom: 10,
  },
  title: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: '#A4A4BE',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    minWidth: 74,
    minHeight: 38,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A3F',
  },
  primaryButton: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  buttonText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 12,
    color: Colors.textPrimary,
    letterSpacing: 0.8,
  },
  primaryButtonText: {
    color: Colors.background,
  },
});
