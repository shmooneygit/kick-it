import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useMemo, useState, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Href } from 'expo-router';
import { format, isAfter, parseISO, subMonths, subWeeks } from 'date-fns';
import { useHistoryStore } from '@/store/history-store';
import { useWorkoutStore } from '@/store/workout-store';
import { useSettingsStore } from '@/store/settings-store';
import { WorkoutRecord } from '@/lib/types';
import { formatConfigShorthand, formatTime, getPresetLabel } from '@/lib/format';
import { Colors, FontFamily, Spacing, withOpacity } from '@/constants/theme';
import { t } from '@/lib/i18n';

type Period = 'week' | 'month' | 'all';

function formatDurationClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
}

function getWeekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export default function StatsScreen() {
  const language = useSettingsStore((s) => s.language);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const history = useHistoryStore((s) => s.history);
  const stats = useHistoryStore((s) => s.stats);
  const loadConfig = useWorkoutStore((s) => s.loadConfig);
  const rememberLastConfig = useWorkoutStore((s) => s.rememberLastConfig);
  const [period, setPeriod] = useState<Period>('all');

  const filtered = useMemo(() => {
    if (period === 'all') {
      return history;
    }

    const cutoff = period === 'week' ? subWeeks(new Date(), 1) : subMonths(new Date(), 1);
    return history.filter((workout) => isAfter(parseISO(workout.date), cutoff));
  }, [history, period]);

  const periodStats = useMemo(() => {
    if (period === 'all') {
      return {
        totalTime: stats.totalDuration,
        totalRounds: stats.totalRounds,
        count: stats.totalWorkouts,
      };
    }

    let totalTime = 0;
    let totalRounds = 0;

    for (const workout of filtered) {
      totalTime += workout.totalDuration;
      totalRounds += workout.completedRounds;
    }

    return { totalTime, totalRounds, count: filtered.length };
  }, [filtered, period, stats.totalDuration, stats.totalRounds, stats.totalWorkouts]);

  const averageMinutes = useMemo(() => {
    if (periodStats.count === 0) {
      return '—';
    }

    return (periodStats.totalTime / periodStats.count / 60).toFixed(1);
  }, [periodStats.count, periodStats.totalTime]);

  const weekdayLabels = useMemo(
    () => [
      t('stats.mon'),
      t('stats.tue'),
      t('stats.wed'),
      t('stats.thu'),
      t('stats.fri'),
      t('stats.sat'),
      t('stats.sun'),
    ],
    [language],
  );

  const weeklyBars = useMemo(() => {
    const totals = Array.from({ length: 7 }, () => 0);

    for (const workout of filtered) {
      const weekdayIndex = getWeekdayIndex(parseISO(workout.date));
      totals[weekdayIndex] += workout.totalDuration / 60;
    }

    const maxMinutes = Math.max(...totals, 0);
    const todayIndex = getWeekdayIndex(new Date());

    return totals.map((minutes, index) => {
      const intensity = maxMinutes > 0 ? minutes / maxMinutes : 0;

      return {
        key: weekdayLabels[index],
        label: weekdayLabels[index],
        isToday: index === todayIndex,
        height: minutes > 0 ? Math.max(intensity * 80, 12) : 4,
        backgroundColor:
          minutes > 0
            ? withOpacity(Colors.green, 0.3 + intensity * 0.7)
            : Colors.track,
      };
    });
  }, [filtered, weekdayLabels]);

  const periods: { key: Period; label: string }[] = [
    { key: 'week', label: t('stats.week') },
    { key: 'month', label: t('stats.month') },
    { key: 'all', label: t('stats.allTime') },
  ];

  const handleRepeat = useCallback(
    (record: WorkoutRecord) => {
      loadConfig(record.config, record.presetId ?? null);
      rememberLastConfig(record.config);
      router.push('/timer' as Href);
    },
    [loadConfig, rememberLastConfig, router],
  );

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

      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>{t('stats.totalTime').toUpperCase()}</Text>
        <Text style={styles.heroValue}>{formatDurationClock(periodStats.totalTime)}</Text>
        <Text style={styles.heroMeta}>{t('stats.timeUnits')}</Text>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{periodStats.totalRounds}</Text>
          <Text style={styles.metricLabel}>{t('stats.totalRounds').toUpperCase()}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{periodStats.count}</Text>
          <Text style={styles.metricLabel}>{t('stats.totalWorkouts').toUpperCase()}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{averageMinutes}</Text>
          <Text style={styles.metricLabel}>{t('stats.averageMinutes').toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>{t('stats.activity').toUpperCase()}</Text>
      <View style={styles.chartCard}>
        <View style={styles.chartRow}>
          {weeklyBars.map((bar) => (
            <View key={bar.key} style={styles.chartColumn}>
              <View style={styles.chartTrack}>
                <View
                  style={[
                    styles.chartBar,
                    {
                      height: bar.height,
                      backgroundColor: bar.backgroundColor,
                    },
                    bar.isToday && styles.chartBarToday,
                  ]}
                />
              </View>
              <Text style={[styles.chartLabel, bar.isToday && styles.chartLabelToday]}>
                {bar.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.historySection}>
        <Text style={styles.sectionLabel}>{t('stats.recent').toUpperCase()}</Text>
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{t('stats.empty')}</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.historyScroll}
            contentContainerStyle={styles.historyContent}
            showsVerticalScrollIndicator={false}
          >
            {filtered.map((workout) => {
              const modeLabel =
                workout.mode === 'boxing' ? t('home.boxing') : t('home.tabata');
              const configParts = [
                modeLabel,
                formatConfigShorthand(workout),
                `${t('stats.restShort')} ${formatTime(workout.config.restDuration)}`,
                !workout.wasCompleted ? t('stats.stopped') : null,
              ].filter(Boolean);

              return (
                <Pressable
                  key={workout.id}
                  style={[styles.historyRow, !workout.wasCompleted && styles.historyRowStopped]}
                  onPress={() => handleRepeat(workout)}
                >
                  <View style={styles.historyTopRow}>
                    <Text style={styles.historyTitle} numberOfLines={1}>
                      {getPresetLabel(workout)}
                    </Text>
                    <Text
                      style={[
                        styles.historyDuration,
                        !workout.wasCompleted && styles.historyDurationStopped,
                      ]}
                    >
                      {formatTime(workout.totalDuration)}
                    </Text>
                  </View>

                  <View style={styles.historyBottomRow}>
                    <Text style={styles.historyMeta} numberOfLines={1}>
                      {configParts.join(' · ')}
                    </Text>
                    <Text style={styles.historyDate}>
                      {format(parseISO(workout.date), 'dd.MM.yyyy HH:mm')}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
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
  title: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 14,
  },
  periodRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  periodPill: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodPillActive: {
    backgroundColor: Colors.green,
  },
  periodText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: Colors.textMeta,
    letterSpacing: 1,
  },
  periodTextActive: {
    color: Colors.background,
    fontFamily: FontFamily.bodyBold,
  },
  heroCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroLabel: {
    fontFamily: FontFamily.body,
    fontSize: 9,
    color: Colors.textMeta,
    letterSpacing: 2,
    marginBottom: 10,
  },
  heroValue: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 36,
    color: Colors.green,
    lineHeight: 40,
    textAlign: 'center',
  },
  heroMeta: {
    marginTop: 6,
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.textMuted,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 24,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  metricLabel: {
    fontFamily: FontFamily.body,
    fontSize: 9,
    color: Colors.textMeta,
    letterSpacing: 1,
    textAlign: 'center',
  },
  sectionLabel: {
    fontFamily: FontFamily.body,
    fontSize: 9,
    color: Colors.textMeta,
    letterSpacing: 1,
    marginBottom: 8,
  },
  chartCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 16,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
  },
  chartTrack: {
    height: 80,
    width: '100%',
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: '100%',
    minHeight: 4,
    backgroundColor: Colors.track,
  },
  chartBarToday: {
    borderWidth: 1,
    borderColor: Colors.green,
  },
  chartLabel: {
    marginTop: 6,
    fontFamily: FontFamily.body,
    fontSize: 8,
    color: Colors.textMeta,
    textAlign: 'center',
  },
  chartLabelToday: {
    color: Colors.green,
  },
  historySection: {
    flex: 1,
  },
  historyScroll: {
    flex: 1,
  },
  historyContent: {
    paddingBottom: 12,
  },
  historyRow: {
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  historyRowStopped: {
    opacity: 0.6,
  },
  historyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },
  historyTitle: {
    flex: 1,
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  historyDuration: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 12,
    color: Colors.green,
  },
  historyDurationStopped: {
    color: Colors.pink,
  },
  historyBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  historyMeta: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.textMeta,
  },
  historyDate: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.textMuted,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
