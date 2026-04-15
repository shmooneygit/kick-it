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
  Spacing,
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
  const rememberLastConfig = useWorkoutStore((s) => s.rememberLastConfig);
  const [period, setPeriod] = useState<Period>('all');

  const filtered = useMemo(() => {
    if (period === 'all') return history;
    const cutoff = period === 'week' ? subWeeks(new Date(), 1) : subMonths(new Date(), 1);
    return history.filter((workout) => isAfter(parseISO(workout.date), cutoff));
  }, [history, period]);

  const periodStats = useMemo(() => {
    let totalTime = 0;
    let totalRounds = 0;
    for (const workout of filtered) {
      totalTime += workout.totalDuration;
      totalRounds += workout.completedRounds;
    }
    return { totalTime, totalRounds, count: filtered.length };
  }, [filtered]);

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

    return days.map((date) => ({
      date: format(date, 'yyyy-MM-dd'),
      count: workoutCounts.get(format(date, 'yyyy-MM-dd')) ?? 0,
      isToday: format(date, 'yyyy-MM-dd') === todayKey,
    }));
  }, [history]);

  const handleRepeat = useCallback(
    (record: WorkoutRecord) => {
      loadConfig(record.config, record.presetId ?? null);
      rememberLastConfig(record.config);
      router.push('/timer' as Href);
    },
    [loadConfig, rememberLastConfig, router],
  );

  const renderWorkout = useCallback(
    ({ item }: { item: WorkoutRecord }) => {
      return (
        <Pressable style={styles.workoutCard} onPress={() => handleRepeat(item)}>
          <View style={styles.workoutInfo}>
            <Text style={styles.workoutTitle}>{getPresetLabel(item)}</Text>
            <Text style={styles.workoutMeta}>{formatConfigShorthand(item)}</Text>
          </View>
          <Text style={styles.workoutDuration}>{formatTime(item.totalDuration)}</Text>
          <Text style={styles.repeatIcon}>▶</Text>
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
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <Text style={styles.title}>{t('stats.title')}</Text>

      <View style={styles.periodRow}>
        {periods.map((item) => (
          <Pressable
            key={item.key}
            style={[styles.periodPill, period === item.key && styles.periodPillActive]}
            onPress={() => setPeriod(item.key)}
          >
            <Text style={[styles.periodText, period === item.key && styles.periodTextActive]}>
              {item.label.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>{t('stats.totalTime').toUpperCase()}</Text>
          <Text style={styles.metricValue}>
            {formatTime(periodStats.totalTime, { style: 'summary' })}
          </Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>{t('stats.totalRounds').toUpperCase()}</Text>
          <Text style={styles.metricValue}>{periodStats.totalRounds}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>{t('stats.totalWorkouts').toUpperCase()}</Text>
          <Text style={styles.metricValue}>{periodStats.count}</Text>
        </View>
      </View>

      <View style={styles.gridSection}>
        <Text style={styles.sectionLabel}>{t('stats.activity').toUpperCase()}</Text>
        <View style={styles.gridContainer}>
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
      </View>

      <Text style={styles.sectionLabel}>{t('stats.recent').toUpperCase()}</Text>
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
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
    letterSpacing: 1,
    marginBottom: 14,
    textAlign: 'center',
  },
  periodRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  periodPill: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  periodPillActive: {
    backgroundColor: Colors.green,
  },
  periodText: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.textMeta,
    letterSpacing: 1,
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
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontFamily: FontFamily.body,
    fontSize: 9,
    color: Colors.textMeta,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 6,
  },
  metricValue: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 18,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  gridSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.textMeta,
    letterSpacing: 1,
    marginBottom: 8,
  },
  gridContainer: {
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    width: GRID_WIDTH,
    alignSelf: 'center',
  },
  gridCell: {
    width: GRID_SIZE,
    height: GRID_SIZE,
  },
  gridCellInactive: {
    backgroundColor: Colors.track,
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
    borderWidth: 1,
    borderColor: Colors.hairline,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 6,
    gap: 8,
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
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  workoutDuration: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.textMuted,
  },
  repeatIcon: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: Colors.green,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: Colors.textMuted,
  },
});
