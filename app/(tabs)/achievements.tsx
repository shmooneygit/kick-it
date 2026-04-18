import { View, Text, Pressable, ScrollView, Modal, StyleSheet } from 'react-native';
import { useState, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useHistoryStore } from '@/store/history-store';
import { useAchievementStore } from '@/store/achievement-store';
import { useSettingsStore } from '@/store/settings-store';
import { badgeDefs } from '@/lib/badges';
import { getLevel } from '@/lib/levels';
import { BadgeDef } from '@/lib/types';
import { Colors, FontFamily, Spacing, withOpacity } from '@/constants/theme';
import { t } from '@/lib/i18n';

function badgeText(language: 'uk' | 'en', obj: { uk: string; en: string }): string {
  return language === 'uk' ? obj.uk : obj.en;
}

export default function AchievementsScreen() {
  const language = useSettingsStore((s) => s.language);

  const insets = useSafeAreaInsets();
  const stats = useHistoryStore((s) => s.stats);
  const badges = useAchievementStore((s) => s.badges);
  const [selectedBadge, setSelectedBadge] = useState<BadgeDef | null>(null);

  const level = getLevel(stats.totalRounds);
  const levelName = badgeText(language, level.name);
  const nextLevelName =
    level.nextLevel === Infinity
      ? t('achievements.maxLevel')
      : badgeText(language, getLevel(level.nextLevel).name);
  const progressToNext =
    level.nextLevel === Infinity
      ? 1
      : (stats.totalRounds - level.minRounds) / (level.nextLevel - level.minRounds);

  const badgeMap = new Map(badges.map((badge) => [badge.id, badge]));

  const handleBadgePress = useCallback((def: BadgeDef) => {
    setSelectedBadge(def);
  }, []);

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top + 10 }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>{t('achievements.title')}</Text>

      <View style={styles.levelCard}>
        <View style={styles.levelTopRow}>
          <View>
            <Text style={styles.levelLabel}>{t('achievements.level').toUpperCase()}</Text>
            <Text style={styles.levelName}>{levelName}</Text>
          </View>
          <View style={styles.levelRight}>
            <Text style={styles.levelLabel}>{t('achievements.next').toUpperCase()}</Text>
            <Text style={styles.levelNext}>{nextLevelName}</Text>
          </View>
        </View>
        <View style={styles.levelBarTrack}>
          <LinearGradient
            colors={[Colors.green, Colors.purple]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.levelBarFill, { width: `${Math.min(progressToNext * 100, 100)}%` }]}
          />
        </View>
        <Text style={styles.levelProgress}>
          {`${stats.totalRounds} / ${level.nextLevel === Infinity ? '∞' : level.nextLevel} ${t('achievements.rounds')}`}
        </Text>
      </View>

      <View style={styles.streakRow}>
        <View style={styles.streakCard}>
          <Text style={styles.streakIconActive}>★</Text>
          <Text style={styles.streakValue}>{stats.currentStreak}</Text>
          <Text style={styles.streakLabel}>{t('achievements.currentStreak').toUpperCase()}</Text>
        </View>
        <View style={styles.streakCard}>
          <Text style={styles.streakIconMuted}>★</Text>
          <Text style={styles.streakValue}>{stats.bestStreak}</Text>
          <Text style={styles.streakLabel}>{t('achievements.bestStreak').toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>{t('achievements.badges').toUpperCase()}</Text>
      <View style={styles.badgeGrid}>
        {badgeDefs.map((def) => {
          const state = badgeMap.get(def.id);
          const earned = state?.earned ?? false;
          const isStreakBadge = def.id.startsWith('streak_');
          const accent = isStreakBadge ? Colors.amber : Colors.green;

          return (
            <Pressable
              key={def.id}
              style={[
                styles.badgeCell,
                earned && { borderColor: withOpacity(accent, 0.2) },
                !earned && styles.badgeCellLocked,
              ]}
              onPress={() => handleBadgePress(def)}
            >
              <Text style={[styles.badgeIcon, { color: earned ? accent : Colors.textMuted }]}>★</Text>
              <Text style={[styles.badgeName, !earned && styles.badgeNameLocked]} numberOfLines={2}>
                {badgeText(language, def.name)}
              </Text>
              {earned ? (
                <Text style={[styles.badgeCheck, { color: accent }]}>✓</Text>
              ) : state?.progress ? (
                <Text style={styles.badgeProgress}>
                  {state.progress.current}/{state.progress.target}
                </Text>
              ) : (
                <Text style={styles.badgeProgress}>—</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <Modal
        visible={selectedBadge !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBadge(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedBadge(null)}>
          <View style={styles.modalContent}>
            {selectedBadge && (
              <>
                <Text style={styles.modalIcon}>{selectedBadge.icon}</Text>
                <Text style={styles.modalName}>{badgeText(language, selectedBadge.name)}</Text>
                <Text style={styles.modalDesc}>{badgeText(language, selectedBadge.description)}</Text>
                {(() => {
                  const state = badgeMap.get(selectedBadge.id);
                  if (state?.earned) {
                    return <Text style={styles.modalEarned}>{t('achievements.earned')}</Text>;
                  }
                  if (state?.progress) {
                    return (
                      <Text style={styles.modalProgress}>
                        {state.progress.current} / {state.progress.target}
                      </Text>
                    );
                  }
                  return null;
                })()}
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  title: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 14,
  },
  levelCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    marginBottom: 14,
  },
  levelTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  levelRight: {
    alignItems: 'flex-end',
  },
  levelLabel: {
    fontFamily: FontFamily.body,
    fontSize: 9,
    color: Colors.textMeta,
    letterSpacing: 1,
    marginBottom: 4,
  },
  levelName: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 20,
    color: Colors.textPrimary,
  },
  levelNext: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  levelBarTrack: {
    height: 4,
    backgroundColor: Colors.track,
    marginBottom: 8,
    overflow: 'hidden',
  },
  levelBarFill: {
    height: '100%',
  },
  levelProgress: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.textMeta,
  },
  streakRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  streakCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 10,
    alignItems: 'center',
  },
  streakIconActive: {
    fontSize: 18,
    color: Colors.amber,
    marginBottom: 6,
  },
  streakIconMuted: {
    fontSize: 18,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  streakValue: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 17,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  streakLabel: {
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
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badgeCell: {
    width: '31.6%',
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 102,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCellLocked: {
    opacity: 0.45,
  },
  badgeIcon: {
    fontSize: 18,
    marginBottom: 6,
  },
  badgeName: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  badgeNameLocked: {
    color: Colors.textMeta,
  },
  badgeCheck: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
  },
  badgeProgress: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.textMeta,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    borderRadius: 0,
    padding: 24,
    alignItems: 'center',
  },
  modalIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  modalName: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDesc: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: Colors.textMeta,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalEarned: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 11,
    color: Colors.green,
  },
  modalProgress: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: Colors.amber,
  },
});
