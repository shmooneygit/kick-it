import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Href } from 'expo-router';
import { useWorkoutStore } from '@/store/workout-store';
import { useSettingsStore } from '@/store/settings-store';
import { NeonButton } from '@/components/neon-button';
import { Colors, FontFamily, FontSize, Spacing, neonGlow } from '@/constants/theme';
import { createSessionResult } from '@/lib/session-result';
import { t } from '@/lib/i18n';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ResultScreen() {
  useSettingsStore((s) => s.settings.language);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const config = useWorkoutStore((s) => s.config);
  const timerState = useWorkoutStore((s) => s.timerState);
  const lastResult = useWorkoutStore((s) => s.lastResult);
  const clearLastResult = useWorkoutStore((s) => s.clearLastResult);

  const sessionResult =
    lastResult ??
    createSessionResult(timerState, config.mode, timerState.phase === 'finished');

  const isBoxing = sessionResult.mode === 'boxing';
  const modeIcon = isBoxing ? '🥊' : '⏱️';

  const handleRepeat = () => {
    router.replace('/timer' as Href);
  };

  const handleDone = () => {
    clearLastResult();
    router.replace('/' as Href);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.content}>
        <Text style={styles.icon}>{modeIcon}</Text>
        <Text style={styles.heading}>{t('result.title')}</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{sessionResult.completedRounds}</Text>
            <Text style={styles.statLabel}>
              {isBoxing ? t('result.roundsCompleted') : t('result.intervalsCompleted')}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatTime(sessionResult.totalDuration)}</Text>
            <Text style={styles.statLabel}>{t('result.totalTime')}</Text>
          </View>
        </View>

        {sessionResult.wasCompleted && (
          <Text style={styles.completed}>{t('result.completed')}</Text>
        )}
      </View>

      <View style={styles.buttons}>
        <NeonButton
          title={`🔄 ${t('result.repeat')}`}
          onPress={handleRepeat}
          color={Colors.neonCyan}
          fullWidth
        />
        <View style={{ height: Spacing.md }} />
        <NeonButton
          title={`🏠 ${t('result.done')}`}
          onPress={handleDone}
          color={Colors.green}
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  heading: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.xxl,
    color: Colors.neonCyan,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: Spacing.xl,
    ...neonGlow(Colors.neonCyan, 12),
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FontFamily.timer,
    fontSize: FontSize.xxl + 4,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  completed: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.green,
    letterSpacing: 1,
  },
  buttons: {
    paddingBottom: Spacing.sm,
  },
});
