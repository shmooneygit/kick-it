import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemo } from 'react';
import { useRouter, Href, useLocalSearchParams } from 'expo-router';
import { useWorkoutStore } from '@/store/workout-store';
import { useHistoryStore } from '@/store/history-store';
import { useAchievementStore } from '@/store/achievement-store';
import { useSettingsStore } from '@/store/settings-store';
import {
  Colors,
  FontFamily,
  Spacing,
  withOpacity,
} from '@/constants/theme';
import { createSessionResult } from '@/lib/session-result';
import { formatConfigShorthand, formatTime, getPresetLabel } from '@/lib/format';
import { t } from '@/lib/i18n';
import { format, parseISO } from 'date-fns';
import { BadgeDef } from '@/lib/types';

function badgeText(language: 'uk' | 'en', badge: BadgeDef): string {
  return language === 'uk' ? badge.name.uk : badge.name.en;
}

function getResultHeading(language: 'uk' | 'en', wasCompleted: boolean): string {
  if (language === 'uk') {
    return wasCompleted ? 'Тренування завершено' : 'Тренування зупинено';
  }

  return wasCompleted ? 'Workout completed' : 'Workout stopped';
}

export default function ResultScreen() {
  const language = useSettingsStore((s) => s.language);

  const router = useRouter();
  const params = useLocalSearchParams<{ recordId?: string; newBadgeIds?: string }>();
  const insets = useSafeAreaInsets();
  const config = useWorkoutStore((s) => s.config);
  const loadConfig = useWorkoutStore((s) => s.loadConfig);
  const rememberLastConfig = useWorkoutStore((s) => s.rememberLastConfig);
  const timerState = useWorkoutStore((s) => s.timerState);
  const lastResult = useWorkoutStore((s) => s.lastResult);
  const clearLastResult = useWorkoutStore((s) => s.clearLastResult);
  const history = useHistoryStore((s) => s.history);
  const getBadgesByIds = useAchievementStore((s) => s.getBadgesByIds);

  const recordId = Array.isArray(params.recordId) ? params.recordId[0] : params.recordId;
  const newBadgeIdsParam = Array.isArray(params.newBadgeIds) ? params.newBadgeIds[0] : params.newBadgeIds;
  const workoutRecord = useMemo(
    () => history.find((item) => item.id === recordId) ?? history[0],
    [history, recordId],
  );
  const earnedBadges = useMemo(() => {
    if (!newBadgeIdsParam) return [];
    try {
      const ids = JSON.parse(newBadgeIdsParam) as string[];
      return getBadgesByIds(Array.isArray(ids) ? ids : []);
    } catch (error) {
      console.warn('[result] badge parse failed:', error);
      return [];
    }
  }, [getBadgesByIds, newBadgeIdsParam]);

  const sessionResult = lastResult ?? (
    workoutRecord
      ? {
          mode: workoutRecord.mode,
          completedRounds: workoutRecord.completedRounds,
          totalDuration: workoutRecord.totalDuration,
          wasCompleted: workoutRecord.wasCompleted,
        }
      : createSessionResult(timerState, config.mode, timerState.phase === 'finished')
  );

  const accent = sessionResult.wasCompleted ? Colors.green : Colors.pink;
  const dateLabel = workoutRecord
    ? format(parseISO(workoutRecord.date), 'dd.MM.yyyy HH:mm')
    : format(new Date(), 'dd.MM.yyyy HH:mm');
  const resultConfig = workoutRecord?.config ?? config;
  const roundsLabel =
    sessionResult.mode === 'boxing' ? t('result.roundsCompleted') : t('result.intervalsCompleted');

  const handleRepeat = () => {
    const repeatConfig = workoutRecord?.config ?? config;
    loadConfig(repeatConfig, workoutRecord?.presetId ?? null);
    rememberLastConfig(repeatConfig);
    clearLastResult();
    router.replace('/timer' as Href);
  };

  const handleDone = () => {
    clearLastResult();
    if (router.canDismiss()) {
      router.dismiss();
      return;
    }

    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/' as Href);
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.statusBox, { borderColor: accent }]}>
          <Text style={[styles.statusMark, { color: accent }]}>✓</Text>
        </View>

        <Text style={styles.heading}>{getResultHeading(language, sessionResult.wasCompleted)}</Text>
        <Text style={styles.dateText}>{dateLabel}</Text>

        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <Text style={styles.modeName}>{getPresetLabel(workoutRecord)}</Text>
            <Text style={styles.modeMeta}>{formatConfigShorthand(resultConfig)}</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>{roundsLabel.toUpperCase()}</Text>
              <Text style={styles.statValue}>{sessionResult.completedRounds}</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>{t('settings.restDuration').toUpperCase()}</Text>
              <Text style={styles.statValue}>{formatTime(resultConfig.restDuration)}</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>{t('result.totalTime').toUpperCase()}</Text>
              <Text style={[styles.statValue, styles.statValueAccent]}>
                {formatTime(sessionResult.totalDuration)}
              </Text>
            </View>
          </View>
        </View>

        {earnedBadges.length > 0 && (
          <View style={styles.badgeCard}>
            {earnedBadges.map((badge, index) => (
              <View
                key={badge.id}
                style={[styles.badgeRow, index < earnedBadges.length - 1 && styles.badgeRowGap]}
              >
                <Text style={styles.badgeIcon}>★</Text>
                <View style={styles.badgeInfo}>
                  <Text style={styles.badgeLabel}>{t('new_badge')}</Text>
                  <Text style={styles.badgeName}>{badgeText(language, badge)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.buttons}>
        <Pressable style={styles.secondaryButton} onPress={handleRepeat}>
          <Text style={styles.secondaryButtonText}>{t('result.repeat')}</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={handleDone}>
          <Text style={styles.primaryButtonText}>{t('result.done')}</Text>
        </Pressable>
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
    justifyContent: 'center',
  },
  statusBox: {
    width: 56,
    height: 56,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  statusMark: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 28,
  },
  heading: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 20,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  dateText: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  statsCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    marginBottom: 16,
  },
  statsHeader: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.hairline,
    paddingBottom: 12,
    marginBottom: 14,
  },
  modeName: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  modeMeta: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCell: {
    flex: 1,
  },
  statLabel: {
    fontFamily: FontFamily.body,
    fontSize: 9,
    color: Colors.textMeta,
    letterSpacing: 1,
    marginBottom: 6,
  },
  statValue: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  statValueAccent: {
    color: Colors.green,
  },
  badgeCard: {
    borderWidth: 1,
    borderColor: withOpacity(Colors.purple, 0.3),
    backgroundColor: withOpacity(Colors.purple, 0.05),
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badgeRowGap: {
    marginBottom: 8,
  },
  badgeIcon: {
    fontSize: 15,
    color: Colors.purple,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeLabel: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.purple,
    marginBottom: 2,
  },
  badgeName: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 13,
    color: Colors.green,
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 13,
    color: Colors.background,
  },
});
