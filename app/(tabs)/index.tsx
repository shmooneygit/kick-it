import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Href } from 'expo-router';
import { useWorkoutStore } from '@/store/workout-store';
import { useHistoryStore } from '@/store/history-store';
import { useSettingsStore } from '@/store/settings-store';
import { ModeCard } from '@/components/mode-card';
import { WorkoutRecord } from '@/lib/types';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { parseISO, format } from 'date-fns';

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return t('greetingMorning');
  if (h < 18) return t('greetingAfternoon');
  return t('greetingEvening');
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function HomeScreen() {
  useSettingsStore((s) => s.settings.language);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const resetConfig = useWorkoutStore((s) => s.resetConfig);
  const loadConfig = useWorkoutStore((s) => s.loadConfig);
  const history = useHistoryStore((s) => s.history);
  const stats = useHistoryStore((s) => s.stats);

  const recentWorkouts = history.slice(0, 3);

  const handleBoxing = () => {
    resetConfig('boxing');
    router.push('/boxing/config' as Href);
  };

  const handleTabata = () => {
    resetConfig('tabata');
    router.push('/tabata/config' as Href);
  };

  const handleRepeat = useCallback(
    (record: WorkoutRecord) => {
      loadConfig(record.config, record.presetId ?? null);
      router.push('/timer' as Href);
    },
    [loadConfig, router],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Header with streak */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getTimeGreeting()}</Text>
          <Text style={styles.title}>{t('home.title')}</Text>
        </View>
        {stats.currentStreak > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>🔥 {stats.currentStreak}</Text>
          </View>
        )}
      </View>

      {/* Mode cards */}
      <View style={styles.cards}>
        <ModeCard
          title={t('home.boxing')}
          description={t('home.boxingDescription')}
          color={Colors.neonGreen}
          icon="boxing-glove"
          onPress={handleBoxing}
          delay={100}
        />
        <ModeCard
          title={t('home.tabata')}
          description={t('home.tabataDescription')}
          color={Colors.neonCyan}
          icon="timer-outline"
          onPress={handleTabata}
          delay={250}
        />
      </View>

      {/* Recent workouts */}
      {recentWorkouts.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.recentLabel}>{t('home.recent')}</Text>
          {recentWorkouts.map((w) => (
            <Pressable key={w.id} style={styles.recentCard} onPress={() => handleRepeat(w)}>
              <Text style={styles.recentIcon}>{w.mode === 'boxing' ? '🥊' : '⏱️'}</Text>
              <View style={styles.recentInfo}>
                <Text style={styles.recentTitle}>
                  {w.completedRounds} {t('stats.rounds')} · {formatTime(w.totalDuration)}
                </Text>
                <Text style={styles.recentDate}>
                  {format(parseISO(w.date), 'dd.MM HH:mm')}
                </Text>
              </View>
              <Text style={styles.repeatBtn}>{t('home.repeat')}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
  },
  greeting: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  title: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.xxl,
    color: Colors.neonCyan,
    fontWeight: '700',
    letterSpacing: 2,
  },
  streakBadge: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.neonAmber + '55',
  },
  streakText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.neonAmber,
  },
  cards: {
    flex: 1,
    gap: Spacing.md,
  },
  recentSection: {
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  recentLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  recentIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  recentInfo: {
    flex: 1,
  },
  recentTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
  },
  recentDate: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs - 1,
    color: Colors.textMuted,
  },
  repeatBtn: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.neonCyan,
  },
});
