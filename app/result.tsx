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
  neonGlow,
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

export default function ResultScreen() {
  const language = useSettingsStore((s) => s.language);

  const router = useRouter();
  const params = useLocalSearchParams<{ recordId?: string; newBadgeIds?: string }>();
  const insets = useSafeAreaInsets();
  const config = useWorkoutStore((s) => s.config);
  const loadConfig = useWorkoutStore((s) => s.loadConfig);
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

  const isBoxing = sessionResult.mode === 'boxing';
  const modeIcon = isBoxing ? '🥊' : '⏱️';
  const accent = sessionResult.wasCompleted ? Colors.green : Colors.pink;
  const title = sessionResult.wasCompleted
    ? t('result.title')
    : t('result.stoppedTitle');
  const dateLabel = workoutRecord
    ? format(parseISO(workoutRecord.date), 'dd.MM.yyyy HH:mm')
    : format(new Date(), 'dd.MM.yyyy HH:mm');
  const resultConfig = workoutRecord?.config ?? config;

  const handleRepeat = () => {
    loadConfig(workoutRecord?.config ?? config, workoutRecord?.presetId ?? null);
    clearLastResult();
    router.replace('/timer' as Href);
  };

  const handleDone = () => {
    clearLastResult();
    router.replace('/' as Href);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.content}>
        <View style={[styles.statusCircle, { borderColor: accent, backgroundColor: withOpacity(accent, 0.1) }]}>
          <Text style={[styles.statusMark, { color: accent }]}>✓</Text>
        </View>
        <Text style={styles.heading}>{title}</Text>
        <Text style={styles.dateText}>{dateLabel}</Text>

        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <Text style={styles.modeIcon}>{modeIcon}</Text>
            <View style={styles.modeInfo}>
              <Text style={styles.modeName}>{getPresetLabel(workoutRecord)}</Text>
              <Text style={styles.modeMeta}>{formatConfigShorthand(resultConfig)}</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>
                {isBoxing ? t('result.roundsCompleted') : t('result.intervalsCompleted')}
              </Text>
              <Text style={styles.statValue}>{sessionResult.completedRounds}</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>{t('settings.restDuration')}</Text>
              <Text style={styles.statValue}>{formatTime(resultConfig.restDuration)}</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>{t('result.totalTime')}</Text>
              <Text style={[styles.statValue, styles.statValueAccent]}>
                {formatTime(sessionResult.totalDuration)}
              </Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>
                {isBoxing ? t('settings.roundDuration') : t('settings.workDuration')}
              </Text>
              <Text style={styles.statValue}>{formatTime(resultConfig.workDuration)}</Text>
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
                <Text style={styles.badgeIcon}>{badge.icon}</Text>
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
          <Text style={styles.secondaryButtonText}>🔄 {t('result.repeat')}</Text>
        </Pressable>
        <Pressable style={styles.primaryButton} onPress={handleDone}>
          <Text style={styles.primaryButtonText}>🏠 {t('result.done')}</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statusMark: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 32,
  },
  heading: {
    fontFamily: FontFamily.heading,
    fontSize: 22,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  dateText: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 24,
  },
  statsCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 20,
    marginBottom: 20,
  },
  badgeCard: {
    width: '100%',
    backgroundColor: withOpacity(Colors.purple, 0.1),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: withOpacity(Colors.purple, 0.3),
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeRowGap: {
    marginBottom: 8,
  },
  badgeIcon: {
    fontSize: 24,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeLabel: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: Colors.purple,
    marginBottom: 2,
  },
  badgeName: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modeIcon: {
    fontSize: 24,
  },
  modeName: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  modeInfo: {
    flex: 1,
  },
  modeMeta: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  statCell: {
    width: '47%',
  },
  statValue: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 20,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  statValueAccent: {
    color: Colors.cyan,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 15,
    color: Colors.cyan,
  },
  primaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    ...neonGlow(Colors.green, 18),
  },
  primaryButtonText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 15,
    color: Colors.background,
  },
});
