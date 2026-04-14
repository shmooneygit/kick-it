import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Href, useFocusEffect } from 'expo-router';
import { useWorkoutStore } from '@/store/workout-store';
import { useHistoryStore } from '@/store/history-store';
import { useSettingsStore } from '@/store/settings-store';
import { NumberStepper } from '@/components/number-stepper';
import { DurationStepper } from '@/components/duration-stepper';
import { TimerMode, WorkoutConfig, WorkoutRecord } from '@/lib/types';
import { formatConfigShorthand, formatTime, getPresetLabel } from '@/lib/format';
import { Colors, FontFamily, Spacing, BorderRadius } from '@/constants/theme';
import { triggerHaptic, triggerNotification } from '@/lib/haptics';
import { t } from '@/lib/i18n';

function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return t('greetingMorning');
  if (h < 18) return t('greetingAfternoon');
  return t('greetingEvening');
}

function computeTotal(config: WorkoutConfig): number {
  return (
    config.countdownDuration +
    config.rounds * config.workDuration +
    Math.max(0, config.rounds - 1) * config.restDuration
  );
}

export default function HomeScreen() {
  useSettingsStore((s) => s.language);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const loadConfig = useWorkoutStore((s) => s.loadConfig);
  const getLastConfigForMode = useWorkoutStore((s) => s.getLastConfigForMode);
  const rememberLastConfig = useWorkoutStore((s) => s.rememberLastConfig);
  const history = useHistoryStore((s) => s.history);

  const [mode, setMode] = useState<TimerMode>('boxing');
  const [localConfig, setLocalConfig] = useState<WorkoutConfig>(() =>
    getLastConfigForMode('boxing'),
  );

  useFocusEffect(
    useCallback(() => {
      setLocalConfig(getLastConfigForMode(mode));
    }, [getLastConfigForMode, mode]),
  );

  const recentWorkouts = history.slice(0, 3);
  const isBoxing = mode === 'boxing';
  const roundsMax = isBoxing ? 50 : 30;
  const workMin = isBoxing ? 15 : 10;
  const workMax = isBoxing ? 900 : 120;
  const workStep = isBoxing ? 15 : 5;
  const restMax = isBoxing ? 300 : 60;

  const totalSeconds = useMemo(() => computeTotal(localConfig), [localConfig]);

  const handleModeSwitch = useCallback(
    (nextMode: TimerMode) => {
      if (nextMode === mode) return;
      triggerHaptic();
      setMode(nextMode);
      setLocalConfig(getLastConfigForMode(nextMode));
    },
    [getLastConfigForMode, mode],
  );

  const updateField = useCallback((partial: Partial<WorkoutConfig>) => {
    setLocalConfig((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleStart = useCallback(() => {
    triggerNotification();
    loadConfig(localConfig);
    rememberLastConfig(localConfig);
    router.push('/timer' as Href);
  }, [loadConfig, localConfig, rememberLastConfig, router]);

  const handleAdvanced = useCallback(() => {
    loadConfig(localConfig);
    const target: Href = isBoxing ? '/boxing/config' : '/tabata/config';
    router.push(target);
  }, [isBoxing, loadConfig, localConfig, router]);

  const handleRepeat = useCallback(
    (record: WorkoutRecord) => {
      loadConfig(record.config, record.presetId ?? null);
      rememberLastConfig(record.config);
      router.push('/timer' as Href);
    },
    [loadConfig, rememberLastConfig, router],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.header}>
        <Text style={styles.greeting}>{getTimeGreeting()}</Text>
      </View>

      {/* Mode switcher */}
      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modePill, isBoxing && styles.modePillActive]}
          onPress={() => handleModeSwitch('boxing')}
        >
          <Text style={[styles.modePillText, isBoxing && styles.modePillTextActive]}>
            🥊 {t('home.boxing')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modePill, !isBoxing && styles.modePillActive]}
          onPress={() => handleModeSwitch('tabata')}
        >
          <Text style={[styles.modePillText, !isBoxing && styles.modePillTextActive]}>
            ⏱️ {t('home.tabata')}
          </Text>
        </Pressable>
      </View>

      {/* Inline config card */}
      <View style={styles.configCard}>
        <Pressable style={styles.gearBtn} onPress={handleAdvanced} hitSlop={10}>
          <Text style={styles.gearIcon}>⚙️</Text>
        </Pressable>

        <View style={styles.grid}>
          <View style={styles.gridCell}>
            <NumberStepper
              label={isBoxing ? t('settings.rounds') : t('settings.intervals')}
              value={localConfig.rounds}
              min={1}
              max={roundsMax}
              onChange={(v) => updateField({ rounds: v })}
              compact
            />
          </View>
          <View style={styles.gridCell}>
            <DurationStepper
              label={isBoxing ? t('settings.roundDuration') : t('settings.workDuration')}
              value={localConfig.workDuration}
              min={workMin}
              max={workMax}
              step={workStep}
              onChange={(v) => updateField({ workDuration: v })}
              compact
            />
          </View>
          <View style={styles.gridCell}>
            <DurationStepper
              label={t('settings.restDuration')}
              value={localConfig.restDuration}
              min={5}
              max={restMax}
              step={5}
              onChange={(v) => updateField({ restDuration: v })}
              compact
            />
          </View>
          <View style={styles.gridCell}>
            <NumberStepper
              label={t('settings.countdown')}
              value={localConfig.countdownDuration}
              min={5}
              max={30}
              step={5}
              onChange={(v) => updateField({ countdownDuration: v })}
              formatValue={(v) => `${v}${t('settings.countdownUnit')}`}
              compact
            />
          </View>
        </View>

        <Text style={styles.totalLine}>
          {t('settings.totalWorkout')}: {formatTime(totalSeconds)}
        </Text>
      </View>

      {/* Spacer pushes start button down */}
      <View style={styles.flexSpacer} />

      {/* START button */}
      <Pressable style={styles.startBtn} onPress={handleStart}>
        <Text style={styles.startBtnText}>{t('settings.start')}</Text>
      </Pressable>

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
    marginBottom: 12,
  },
  greeting: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modePill: {
    flex: 1,
    height: 44,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modePillActive: {
    backgroundColor: Colors.cyan,
  },
  modePillText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 14,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  modePillTextActive: {
    color: '#0A0A0F',
    fontFamily: FontFamily.bodyBold,
  },
  configCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gearBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  gearIcon: {
    fontSize: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  gridCell: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 8,
  },
  totalLine: {
    marginTop: 12,
    textAlign: 'center',
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  flexSpacer: {
    flex: 1,
    minHeight: 16,
  },
  startBtn: {
    height: 64,
    borderRadius: 16,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
    marginBottom: 14,
  },
  startBtnText: {
    fontFamily: FontFamily.bodyBold,
    fontSize: 22,
    fontWeight: '700',
    color: '#0A0A0F',
    letterSpacing: 3,
  },
  recentSection: {
    paddingTop: 4,
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
    color: Colors.cyan,
  },
  emptyRecent: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
