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
import { Colors, FontFamily } from '@/constants/theme';
import { triggerHaptic, triggerNotification } from '@/lib/haptics';
import { t } from '@/lib/i18n';

function getGreetingLabel(language: 'uk' | 'en'): string {
  const h = new Date().getHours();

  if (language === 'uk') {
    if (h < 12) return 'Доброго ранку';
    if (h < 18) return 'Добрий день';
    return 'Добрий вечір';
  }

  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function getClockLabel(language: 'uk' | 'en'): string {
  const locale = language === 'uk' ? 'uk-UA' : 'en-US';
  return new Date().toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function computeTotal(config: WorkoutConfig): number {
  return (
    config.countdownDuration +
    config.rounds * config.workDuration +
    Math.max(0, config.rounds - 1) * config.restDuration
  );
}

interface ConfigRowProps {
  label: string;
  children: React.ReactNode;
  isLast?: boolean;
}

function ConfigRow({ label, children, isLast = false }: ConfigRowProps) {
  return (
    <View style={[styles.configRow, !isLast && styles.configRowDivider]}>
      <Text style={styles.configRowLabel}>{label.toUpperCase()}</Text>
      <View style={styles.configRowControl}>{children}</View>
    </View>
  );
}

export default function HomeScreen() {
  const language = useSettingsStore((s) => s.language);

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
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.greeting}>{getGreetingLabel(language)}</Text>
        <Text style={styles.clock}>{getClockLabel(language)}</Text>
      </View>

      <View style={styles.modeRow}>
        <Pressable
          style={[styles.modePill, isBoxing && styles.modePillActive]}
          onPress={() => handleModeSwitch('boxing')}
        >
          <Text style={[styles.modePillText, isBoxing && styles.modePillTextActive]}>
            {t('home.boxing').toUpperCase()}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modePill, !isBoxing && styles.modePillActive]}
          onPress={() => handleModeSwitch('tabata')}
        >
          <Text style={[styles.modePillText, !isBoxing && styles.modePillTextActive]}>
            {t('home.tabata').toUpperCase()}
          </Text>
        </Pressable>
      </View>

      <View style={styles.configCard}>
        <Pressable style={styles.gearBtn} onPress={handleAdvanced} hitSlop={10}>
          <Text style={styles.gearIcon}>⚙</Text>
        </Pressable>

        <ConfigRow label={isBoxing ? t('settings.rounds') : t('settings.intervals')}>
          <NumberStepper
            label=""
            value={localConfig.rounds}
            min={1}
            max={roundsMax}
            onChange={(v) => updateField({ rounds: v })}
            compact
          />
        </ConfigRow>

        <ConfigRow label={isBoxing ? t('settings.roundDuration') : t('settings.workDuration')}>
          <DurationStepper
            label=""
            value={localConfig.workDuration}
            min={workMin}
            max={workMax}
            step={workStep}
            onChange={(v) => updateField({ workDuration: v })}
            compact
          />
        </ConfigRow>

        <ConfigRow label={t('settings.restDuration')}>
          <DurationStepper
            label=""
            value={localConfig.restDuration}
            min={5}
            max={restMax}
            step={5}
            onChange={(v) => updateField({ restDuration: v })}
            compact
          />
        </ConfigRow>

        <ConfigRow label={t('settings.countdown')} isLast>
          <NumberStepper
            label=""
            value={localConfig.countdownDuration}
            min={5}
            max={30}
            step={5}
            onChange={(v) => updateField({ countdownDuration: v })}
            formatValue={(v) => `${v}${t('settings.countdownUnit')}`}
            compact
          />
        </ConfigRow>

        <Text style={styles.totalLine}>
          <Text style={styles.totalLineLabel}>{t('settings.totalWorkout')}: </Text>
          <Text style={styles.totalLineValue}>{formatTime(totalSeconds)}</Text>
        </Text>
      </View>

      <View style={styles.flexSpacer} />

      <View style={styles.recentSection}>
        <Text style={styles.recentLabel}>{t('home.recent').toUpperCase()}</Text>
        {recentWorkouts.length > 0 ? (
          recentWorkouts.map((workout) => (
            <Pressable
              key={workout.id}
              style={styles.recentCard}
              onPress={() => handleRepeat(workout)}
            >
              <View style={styles.recentInfo}>
                <Text style={styles.recentTitle}>{getPresetLabel(workout)}</Text>
                <Text style={styles.recentMeta}>{formatConfigShorthand(workout)}</Text>
              </View>
              <Text style={styles.recentDuration}>{formatTime(workout.totalDuration)}</Text>
              <Text style={styles.repeatBtn}>▶</Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.emptyRecent}>{t('home.recentEmpty')}</Text>
        )}
      </View>

      <Pressable style={styles.startBtn} onPress={handleStart}>
        <Text style={styles.startBtnText}>{t('settings.start').toUpperCase()}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  greeting: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  clock: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: Colors.textMeta,
  },
  modeRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Colors.green,
    marginBottom: 14,
  },
  modePill: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modePillActive: {
    backgroundColor: Colors.green,
  },
  modePillText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 12,
    color: Colors.green,
    letterSpacing: 2,
  },
  modePillTextActive: {
    color: Colors.background,
    fontFamily: FontFamily.bodyBold,
  },
  configCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
  },
  gearBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  gearIcon: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingRight: 24,
    gap: 8,
  },
  configRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.hairline,
  },
  configRowLabel: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  configRowControl: {
    alignItems: 'flex-end',
  },
  totalLine: {
    marginTop: 10,
    textAlign: 'center',
    fontFamily: FontFamily.body,
    fontSize: 11,
  },
  totalLineLabel: {
    color: Colors.textMeta,
  },
  totalLineValue: {
    color: Colors.textSecondary,
  },
  flexSpacer: {
    flex: 1,
    minHeight: 16,
  },
  recentSection: {
    marginBottom: 14,
  },
  recentLabel: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.textMeta,
    marginBottom: 8,
    letterSpacing: 1,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.hairline,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 6,
    gap: 8,
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
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  recentDuration: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.textMuted,
  },
  repeatBtn: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: Colors.green,
  },
  emptyRecent: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: Colors.textMuted,
    paddingVertical: 10,
    textAlign: 'center',
  },
  startBtn: {
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  startBtnText: {
    fontFamily: FontFamily.heading,
    fontSize: 18,
    color: Colors.background,
    letterSpacing: 5,
  },
});
