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
import { Colors, FontFamily, FontSize, Spacing, BorderRadius } from '@/constants/theme';
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
    level.nextLevel === Infinity ? t('achievements.maxLevel') : badgeText(language, getLevel(level.nextLevel).name);
  const progressToNext =
    level.nextLevel === Infinity
      ? 1
      : (stats.totalRounds - level.minRounds) / (level.nextLevel - level.minRounds);

  const badgeMap = new Map(badges.map((b) => [b.id, b]));

  const handleBadgePress = useCallback((def: BadgeDef) => {
    setSelectedBadge(def);
  }, []);

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top + 8 }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>{t('achievements.title')}</Text>

      {/* Level system */}
      <View style={styles.levelCard}>
        <View style={styles.levelTopRow}>
          <View>
            <Text style={styles.levelLabel}>{t('achievements.level')}</Text>
            <Text style={styles.levelName}>{levelName}</Text>
          </View>
          <View style={styles.levelRight}>
            <Text style={styles.levelLabel}>{t('achievements.next')}</Text>
            <Text style={styles.levelNext}>{nextLevelName}</Text>
          </View>
        </View>
        <View style={styles.levelBarTrack}>
          <LinearGradient
            colors={[Colors.neonCyan, Colors.purple]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.levelBarFill, { width: `${Math.min(progressToNext * 100, 100)}%` }]}
          />
        </View>
        <Text style={styles.levelProgress}>
          {stats.totalRounds} / {level.nextLevel === Infinity ? '∞' : level.nextLevel} {t('achievements.rounds')}
        </Text>
      </View>

      {/* Streak */}
      <View style={styles.streakRow}>
        <View style={styles.streakCard}>
          <Text style={styles.streakIcon}>🔥</Text>
          <Text style={styles.streakValue}>{stats.currentStreak}</Text>
          <Text style={styles.streakLabel}>{t('achievements.currentStreak')}</Text>
        </View>
        <View style={styles.streakCard}>
          <Text style={styles.streakIconMuted}>🏆</Text>
          <Text style={styles.streakValue}>{stats.bestStreak}</Text>
          <Text style={styles.streakLabel}>{t('achievements.bestStreak')}</Text>
        </View>
      </View>

      {/* Badges grid */}
      <Text style={styles.sectionLabel}>{t('achievements.badges')}</Text>
      <View style={styles.badgeGrid}>
        {badgeDefs.map((def) => {
          const state = badgeMap.get(def.id);
          const earned = state?.earned ?? false;
          return (
            <Pressable
              key={def.id}
              style={[styles.badgeCell, earned && styles.badgeCellEarned]}
              onPress={() => handleBadgePress(def)}
            >
              <Text style={[styles.badgeIcon, !earned && styles.badgeIconLocked]}>
                {earned ? def.icon : def.icon}
              </Text>
              <Text
                style={[styles.badgeName, !earned && styles.badgeNameLocked]}
                numberOfLines={1}
              >
                {badgeText(language, def.name)}
              </Text>
              {earned ? (
                <Text style={styles.badgeCheck}>✓</Text>
              ) : state?.progress ? (
                <Text style={styles.badgeProgress}>
                  {state.progress.current}/{state.progress.target}
                </Text>
              ) : (
                <Text style={styles.badgeProgress}>🔒</Text>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Badge detail modal */}
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
                  if (state?.earned) return <Text style={styles.modalEarned}>{t('achievements.earned')}</Text>;
                  if (state?.progress)
                    return (
                      <Text style={styles.modalProgress}>
                        {state.progress.current} / {state.progress.target}
                      </Text>
                    );
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
    paddingBottom: 32,
  },
  title: {
    fontFamily: FontFamily.heading,
    fontSize: 18,
    color: Colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  // Level
  levelCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 16,
    marginBottom: 14,
  },
  levelTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  levelLabel: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  levelName: {
    fontFamily: FontFamily.heading,
    fontSize: 22,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginTop: 4,
  },
  levelRight: {
    alignItems: 'flex-end',
  },
  levelNext: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  levelBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 3,
    marginBottom: Spacing.xs,
    overflow: 'hidden',
  },
  levelBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  levelProgress: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  // Streak
  streakRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  streakCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 12,
    alignItems: 'center',
  },
  streakIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  streakIconMuted: {
    fontSize: 24,
    marginBottom: 6,
    opacity: 0.7,
  },
  streakValue: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 20,
    color: Colors.textPrimary,
  },
  streakLabel: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  sectionLabel: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  // Badges
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeCell: {
    width: '31%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 10,
    alignItems: 'center',
    minHeight: 96,
    justifyContent: 'center',
  },
  badgeCellEarned: {
    borderColor: 'rgba(57,255,20,0.2)',
  },
  badgeIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  badgeIconLocked: {
    opacity: 0.5,
  },
  badgeName: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  badgeNameLocked: {
    color: Colors.textMuted,
  },
  badgeCheck: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: Colors.green,
    marginTop: 4,
  },
  badgeProgress: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.xl,
    alignItems: 'center',
    width: '80%',
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  modalName: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  modalDesc: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  modalEarned: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.green,
  },
  modalProgress: {
    fontFamily: FontFamily.timer,
    fontSize: FontSize.lg,
    color: Colors.neonAmber,
  },
});
