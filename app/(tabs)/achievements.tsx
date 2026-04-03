import { View, Text, Pressable, ScrollView, Modal, StyleSheet } from 'react-native';
import { useState, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHistoryStore } from '@/store/history-store';
import { useAchievementStore } from '@/store/achievement-store';
import { useSettingsStore } from '@/store/settings-store';
import { badgeDefs } from '@/lib/badges';
import { getLevel } from '@/lib/levels';
import { BadgeDef } from '@/lib/types';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, neonGlow } from '@/constants/theme';
import i18n, { t } from '@/lib/i18n';

function badgeText(obj: { uk: string; en: string }): string {
  return i18n.locale === 'uk' ? obj.uk : obj.en;
}

export default function AchievementsScreen() {
  useSettingsStore((s) => s.settings.language);

  const insets = useSafeAreaInsets();
  const stats = useHistoryStore((s) => s.stats);
  const badges = useAchievementStore((s) => s.badges);
  const [selectedBadge, setSelectedBadge] = useState<BadgeDef | null>(null);

  const level = getLevel(stats.totalRounds);
  const levelName = badgeText(level.name);
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
        <Text style={styles.levelLabel}>{t('achievements.level')}</Text>
        <Text style={[styles.levelName, neonGlow(Colors.neonAmber, 8)]}>{levelName}</Text>
        <View style={styles.levelBarTrack}>
          <View style={[styles.levelBarFill, { width: `${Math.min(progressToNext * 100, 100)}%` }]} />
        </View>
        <Text style={styles.levelProgress}>
          {stats.totalRounds} / {level.nextLevel === Infinity ? '∞' : level.nextLevel} {t('achievements.rounds')}
        </Text>
      </View>

      {/* Streak */}
      <View style={styles.streakCard}>
        <Text style={styles.streakLine}>
          🔥 {t('achievements.currentStreak')}: {stats.currentStreak} {t('achievements.days')}
        </Text>
        <Text style={styles.streakBest}>
          {t('achievements.bestStreak')}: {stats.bestStreak} {t('achievements.days')}
        </Text>
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
                {earned ? def.icon : '🔒'}
              </Text>
              <Text
                style={[styles.badgeName, !earned && styles.badgeNameLocked]}
                numberOfLines={1}
              >
                {badgeText(def.name)}
              </Text>
              {!earned && state?.progress && (
                <Text style={styles.badgeProgress}>
                  {state.progress.current}/{state.progress.target}
                </Text>
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
                <Text style={styles.modalName}>{badgeText(selectedBadge.name)}</Text>
                <Text style={styles.modalDesc}>{badgeText(selectedBadge.description)}</Text>
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
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  // Level
  levelCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  levelLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  levelName: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.xxl,
    color: Colors.neonAmber,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  levelBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 3,
    marginBottom: Spacing.xs,
    overflow: 'hidden',
  },
  levelBarFill: {
    height: '100%',
    backgroundColor: Colors.neonAmber,
    borderRadius: 3,
  },
  levelProgress: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  // Streak
  streakCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  streakLine: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  streakBest: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  sectionLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  // Badges
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  badgeCell: {
    width: '31%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.sm,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
  badgeCellEarned: {
    borderColor: Colors.neonAmber + '66',
    ...neonGlow(Colors.neonAmber, 6),
  },
  badgeIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  badgeIconLocked: {
    opacity: 0.5,
  },
  badgeName: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs - 1,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  badgeNameLocked: {
    color: Colors.textMuted,
  },
  badgeProgress: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs - 2,
    color: Colors.textMuted,
    marginTop: 2,
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
