import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Href } from 'expo-router';
import { useWorkoutStore } from '@/store/workout-store';
import { useHistoryStore } from '@/store/history-store';
import { useSettingsStore } from '@/store/settings-store';
import { ModeCard } from '@/components/mode-card';
import { WorkoutRecord } from '@/lib/types';
import { formatConfigShorthand, formatTime, getPresetLabel } from '@/lib/format';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { t } from '@/lib/i18n';

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return t('greetingMorning');
  if (h < 18) return t('greetingAfternoon');
  return t('greetingEvening');
}

export default function HomeScreen() {
  useSettingsStore((s) => s.language);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const loadConfig = useWorkoutStore((s) => s.loadConfig);
  const history = useHistoryStore((s) => s.history);

  const recentWorkouts = history.slice(0, 3);

  const handleBoxing = () => {
    router.push('/boxing/config' as Href);
  };

  const handleTabata = () => {
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
        <Text style={styles.greeting}>{getTimeGreeting()}</Text>
      </View>

      {/* Mode cards */}
      <View style={styles.cards}>
        <ModeCard
          title={t('home.boxing')}
          description={t('home.boxingDescription')}
          emoji="🥊"
          gradientTo="#2A1015"
          onPress={handleBoxing}
          delay={100}
        />
        <ModeCard
          title={t('home.tabata')}
          description={t('home.tabataDescription')}
          emoji="⏱️"
          gradientTo="#0A1520"
          onPress={handleTabata}
          delay={250}
        />
      </View>

      {/* Recent workouts */}
      <View style={styles.recentSection}>
        <Text style={styles.recentLabel}>{t('home.recent')}</Text>
        {recentWorkouts.length > 0 ? (
          recentWorkouts.map((w) => (
            <Pressable key={w.id} style={styles.recentCard} onPress={() => handleRepeat(w)}>
              <Text style={styles.recentIcon}>{w.mode === 'boxing' ? '🥊' : '⏱️'}</Text>
              <View style={styles.recentInfo}>
                <Text style={styles.recentTitle}>{getPresetLabel(w)}</Text>
                <Text style={styles.recentMeta}>{formatConfigShorthand(w)}</Text>
              </View>
              <Text style={styles.recentDuration}>{formatTime(w.totalDuration)}</Text>
              <View style={styles.repeatPill}>
                <Text style={styles.repeatBtn}>▶</Text>
              </View>
            </Pressable>
          ))
        ) : (
          <Text style={styles.emptyRecent}>{t('home.recentEmpty')}</Text>
        )}
      </View>
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
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greeting: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  cards: {
    flexGrow: 1,
    gap: 12,
  },
  recentSection: {
    paddingTop: 16,
    paddingBottom: 6,
  },
  recentLabel: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    gap: 10,
  },
  recentIcon: {
    fontSize: 16,
  },
  recentInfo: {
    flex: 1,
  },
  recentTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  recentMeta: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  recentDuration: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  repeatPill: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  repeatBtn: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 12,
    color: Colors.neonCyan,
  },
  emptyRecent: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
