import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useMemo, useState, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Href } from 'expo-router';
import { useHistoryStore } from '@/store/history-store';
import { useWorkoutStore } from '@/store/workout-store';
import { useSettingsStore } from '@/store/settings-store';
import { WorkoutRecord } from '@/lib/types';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { t } from '@/lib/i18n';
import {
  subWeeks,
  subMonths,
  parseISO,
  isAfter,
  format,
  startOfDay,
  eachDayOfInterval,
  subDays,
} from 'date-fns';

type Period = 'week' | 'month' | 'all';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}${t('stats.hourShort')} ${rm}${t('stats.minuteShort')}`;
  }
  return `${m}${t('stats.minuteShort')}`;
}

export default function StatsScreen() {
  useSettingsStore((s) => s.settings.language);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const history = useHistoryStore((s) => s.history);
  const loadConfig = useWorkoutStore((s) => s.loadConfig);
  const [period, setPeriod] = useState<Period>('all');

  const filtered = useMemo(() => {
    if (period === 'all') return history;
    const cutoff = period === 'week' ? subWeeks(new Date(), 1) : subMonths(new Date(), 1);
    return history.filter((w) => isAfter(parseISO(w.date), cutoff));
  }, [history, period]);

  const periodStats = useMemo(() => {
    let totalTime = 0;
    let totalRounds = 0;
    for (const w of filtered) {
      totalTime += w.totalDuration;
      totalRounds += w.completedRounds;
    }
    return { totalTime, totalRounds, count: filtered.length };
  }, [filtered]);

  // Activity grid: last 12 weeks (84 days)
  const activityDays = useMemo(() => {
    const today = startOfDay(new Date());
    const start = subDays(today, 83);
    const days = eachDayOfInterval({ start, end: today });
    const workoutDates = new Set(
      history.map((w) => format(parseISO(w.date), 'yyyy-MM-dd')),
    );
    return days.map((d) => ({
      date: format(d, 'yyyy-MM-dd'),
      hasWorkout: workoutDates.has(format(d, 'yyyy-MM-dd')),
    }));
  }, [history]);

  const handleRepeat = useCallback(
    (record: WorkoutRecord) => {
      loadConfig(record.config, record.presetId ?? null);
      router.push('/timer' as Href);
    },
    [loadConfig, router],
  );

  const renderWorkout = useCallback(
    ({ item }: { item: WorkoutRecord }) => {
      const modeIcon = item.mode === 'boxing' ? '🥊' : '⏱️';
      const dateStr = format(parseISO(item.date), 'dd.MM HH:mm');
      return (
        <Pressable style={styles.workoutCard} onPress={() => handleRepeat(item)}>
          <Text style={styles.workoutIcon}>{modeIcon}</Text>
          <View style={styles.workoutInfo}>
            <Text style={styles.workoutTitle}>
              {item.completedRounds} {t('stats.rounds')} · {formatTime(item.totalDuration)}
            </Text>
            <Text style={styles.workoutDate}>{dateStr}</Text>
          </View>
          <Text style={styles.repeatIcon}>🔄</Text>
        </Pressable>
      );
    },
    [handleRepeat],
  );

  const periods: { key: Period; label: string }[] = [
    { key: 'week', label: t('stats.week') },
    { key: 'month', label: t('stats.month') },
    { key: 'all', label: t('stats.allTime') },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>{t('stats.title')}</Text>

      {/* Period selector */}
      <View style={styles.periodRow}>
        {periods.map((p) => (
          <Pressable
            key={p.key}
            style={[styles.periodPill, period === p.key && styles.periodPillActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Metric cards */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{formatTime(periodStats.totalTime)}</Text>
          <Text style={styles.metricLabel}>{t('stats.totalTime')}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{periodStats.totalRounds}</Text>
          <Text style={styles.metricLabel}>{t('stats.totalRounds')}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{periodStats.count}</Text>
          <Text style={styles.metricLabel}>{t('stats.totalWorkouts')}</Text>
        </View>
      </View>

      {/* Activity grid */}
      <View style={styles.gridSection}>
        <Text style={styles.sectionLabel}>{t('stats.activity')}</Text>
        <View style={styles.grid}>
          {activityDays.map((day) => (
            <View
              key={day.date}
              style={[
                styles.gridCell,
                day.hasWorkout ? styles.gridCellActive : styles.gridCellInactive,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Recent workouts */}
      <Text style={styles.sectionLabel}>{t('stats.recent')}</Text>
      {history.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('stats.empty')}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered.slice(0, 20)}
          keyExtractor={(item) => item.id}
          renderItem={renderWorkout}
          showsVerticalScrollIndicator={false}
          style={styles.list}
        />
      )}
    </View>
  );
}

const GRID_SIZE = 10;
const GRID_GAP = 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  periodRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  periodPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodPillActive: {
    borderColor: Colors.neonCyan,
    backgroundColor: Colors.neonCyan + '18',
  },
  periodText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  periodTextActive: {
    color: Colors.neonCyan,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  metricValue: {
    fontFamily: FontFamily.timer,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  metricLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs - 1,
    color: Colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  gridSection: {
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  gridCell: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    borderRadius: 2,
  },
  gridCellActive: {
    backgroundColor: Colors.green,
  },
  gridCellInactive: {
    backgroundColor: Colors.surface,
  },
  list: {
    flex: 1,
  },
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  workoutIcon: {
    fontSize: 20,
    marginRight: Spacing.sm,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  workoutDate: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  repeatIcon: {
    fontSize: 16,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
});
