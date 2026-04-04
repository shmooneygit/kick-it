import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useMemo, useState, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Href } from 'expo-router';
import { useHistoryStore } from '@/store/history-store';
import { useWorkoutStore } from '@/store/workout-store';
import { useSettingsStore } from '@/store/settings-store';
import { WorkoutRecord } from '@/lib/types';
import { formatConfigShorthand, formatTime, getPresetLabel } from '@/lib/format';
import {
  Colors,
  FontFamily,
  FontSize,
  Spacing,
  BorderRadius,
  withOpacity,
} from '@/constants/theme';
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

export default function StatsScreen() {
  useSettingsStore((s) => s.language);

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
    const todayKey = format(today, 'yyyy-MM-dd');
    const workoutCounts = new Map<string, number>();

    for (const workout of history) {
      const key = format(parseISO(workout.date), 'yyyy-MM-dd');
      workoutCounts.set(key, (workoutCounts.get(key) ?? 0) + 1);
    }

    return days.map((d) => ({
      date: format(d, 'yyyy-MM-dd'),
      count: workoutCounts.get(format(d, 'yyyy-MM-dd')) ?? 0,
      isToday: format(d, 'yyyy-MM-dd') === todayKey,
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
      return (
        <Pressable style={styles.workoutCard} onPress={() => handleRepeat(item)}>
          <Text style={styles.workoutIcon}>{modeIcon}</Text>
          <View style={styles.workoutInfo}>
            <Text style={styles.workoutTitle}>{getPresetLabel(item)}</Text>
            <Text style={styles.workoutMeta}>{formatConfigShorthand(item)}</Text>
          </View>
          <Text style={styles.workoutDuration}>{formatTime(item.totalDuration)}</Text>
          <View style={styles.repeatPill}>
            <Text style={styles.repeatIcon}>▶</Text>
          </View>
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
          <Text style={styles.metricLabel}>{t('stats.totalTime')}</Text>
          <Text style={styles.metricValue}>
            {formatTime(periodStats.totalTime, { style: 'summary' })}
          </Text>
          <Text style={styles.metricSubtitle}>{periods.find((item) => item.key === period)?.label}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>{t('stats.totalRounds')}</Text>
          <Text style={styles.metricValue}>{periodStats.totalRounds}</Text>
          <Text style={styles.metricSubtitle}>{periods.find((item) => item.key === period)?.label}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>{t('stats.totalWorkouts')}</Text>
          <Text style={styles.metricValue}>{periodStats.count}</Text>
          <Text style={styles.metricSubtitle}>{periods.find((item) => item.key === period)?.label}</Text>
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
                day.count > 0
                  ? { backgroundColor: withOpacity(Colors.green, Math.min(0.3 + day.count * 0.2, 1)) }
                  : styles.gridCellInactive,
                day.isToday && styles.gridCellToday,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Recent workouts */}
      <Text style={styles.sectionLabel}>{t('stats.recent')}</Text>
      {filtered.length === 0 ? (
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

const GRID_SIZE = 12;
const GRID_GAP = 3;
const GRID_WIDTH = GRID_SIZE * 12 + GRID_GAP * 11;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.heading,
    fontSize: 18,
    color: Colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 14,
    textAlign: 'center',
  },
  periodRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 6,
    marginBottom: 16,
  },
  periodPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surfaceLight,
  },
  periodPillActive: {
    backgroundColor: Colors.cyan,
  },
  periodText: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  periodTextActive: {
    color: Colors.background,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  metricValue: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 20,
    color: Colors.textPrimary,
  },
  metricLabel: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  metricSubtitle: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  gridSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  grid: {
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 12,
    padding: 12,
    gap: GRID_GAP,
    width: GRID_WIDTH + 24,
    alignSelf: 'center',
  },
  gridCell: {
    width: GRID_SIZE,
    height: GRID_SIZE,
    borderRadius: 3,
  },
  gridCellInactive: {
    backgroundColor: Colors.surfaceLight,
  },
  gridCellToday: {
    borderWidth: 1,
    borderColor: Colors.green,
  },
  list: {
    flex: 1,
  },
  workoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    gap: 10,
  },
  workoutIcon: {
    fontSize: 16,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  workoutMeta: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  workoutDuration: {
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
  repeatIcon: {
    fontSize: 12,
    color: Colors.cyan,
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
