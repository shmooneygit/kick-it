import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  LayoutAnimation,
  Platform,
  TextInput,
  UIManager,
} from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Href, useFocusEffect } from 'expo-router';
import { useWorkoutStore } from '@/store/workout-store';
import { useHistoryStore } from '@/store/history-store';
import { useSettingsStore } from '@/store/settings-store';
import { NumberStepper } from '@/components/number-stepper';
import { DurationStepper } from '@/components/duration-stepper';
import { usePresets } from '@/hooks/use-presets';
import { Preset, TimerMode, WorkoutConfig, WorkoutRecord } from '@/lib/types';
import { formatConfigShorthand, formatTime, getPresetLabel } from '@/lib/format';
import { Colors, FontFamily, FontSize } from '@/constants/theme';
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
  const [expanded, setExpanded] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [showDuration, setShowDuration] = useState(false);
  const [targetMinutes, setTargetMinutes] = useState<number | null>(null);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveInputName, setSaveInputName] = useState('');
  const { presets, savePreset, getPresetName } = usePresets(mode);

  useEffect(() => {
    if (
      Platform.OS === 'android' &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLocalConfig(getLastConfigForMode(mode));
      setExpanded(false);
      setActivePresetId(null);
      setShowDuration(false);
      setTargetMinutes(null);
      setShowSaveInput(false);
      setSaveInputName('');
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
      if (expanded) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setMode(nextMode);
      setLocalConfig(getLastConfigForMode(nextMode));
      setExpanded(false);
      setActivePresetId(null);
      setShowDuration(false);
      setTargetMinutes(null);
      setShowSaveInput(false);
      setSaveInputName('');
    },
    [expanded, getLastConfigForMode, mode],
  );

  const updateField = useCallback((partial: Partial<WorkoutConfig>) => {
    setLocalConfig((prev) => ({ ...prev, ...partial }));
    setActivePresetId(null);
  }, []);

  const handleStart = useCallback(() => {
    triggerNotification();
    loadConfig(localConfig, activePresetId);
    rememberLastConfig(localConfig);
    router.push('/timer' as Href);
  }, [activePresetId, loadConfig, localConfig, rememberLastConfig, router]);

  const handleAdvancedToggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);

    if (expanded) {
      setShowSaveInput(false);
      setSaveInputName('');
    }
  }, [expanded]);

  const loadPreset = useCallback(
    (preset: Preset) => {
      setLocalConfig({
        mode,
        rounds: preset.rounds,
        workDuration: preset.workDuration,
        restDuration: preset.restDuration,
        countdownDuration: preset.countdownDuration,
      });
      setActivePresetId(preset.id);
      setShowDuration(true);
      const totalSec = computeTotal({
        mode,
        rounds: preset.rounds,
        workDuration: preset.workDuration,
        restDuration: preset.restDuration,
        countdownDuration: preset.countdownDuration,
      });
      setTargetMinutes(Math.max(5, Math.round(totalSec / 60)));
      triggerHaptic();
    },
    [mode],
  );

  const handleDurationChange = useCallback(
    (minutes: number) => {
      setTargetMinutes(minutes);
      const targetSeconds = minutes * 60;
      const cycleDuration = localConfig.workDuration + localConfig.restDuration;
      const newRounds = Math.max(
        1,
        Math.round(
          (targetSeconds - localConfig.countdownDuration + localConfig.restDuration) /
            cycleDuration,
        ),
      );
      setLocalConfig((prev) => ({ ...prev, rounds: newRounds }));
      setActivePresetId(null);
    },
    [localConfig.countdownDuration, localConfig.restDuration, localConfig.workDuration],
  );

  const openSaveInput = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowSaveInput(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!saveInputName.trim()) return;
    await savePreset(saveInputName.trim(), localConfig);
    setSaveInputName('');
    setShowSaveInput(false);
    triggerNotification();
  }, [localConfig, saveInputName, savePreset]);

  const handleRepeat = useCallback(
    (record: WorkoutRecord) => {
      loadConfig(record.config, record.presetId ?? null);
      rememberLastConfig(record.config);
      router.push('/timer' as Href);
    },
    [loadConfig, rememberLastConfig, router],
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: 16 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
          <Pressable style={styles.gearBtn} onPress={handleAdvancedToggle} hitSlop={10}>
            <Text style={[styles.gearIcon, expanded && styles.gearIconActive]}>
              {expanded ? '✕' : '⚙'}
            </Text>
          </Pressable>

          <ConfigRow label={isBoxing ? t('settings.rounds') : t('settings.intervals')}>
            <NumberStepper
              label=""
              value={localConfig.rounds}
              min={1}
              max={roundsMax}
              onChange={(value) => updateField({ rounds: value })}
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
              onChange={(value) => updateField({ workDuration: value })}
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
              onChange={(value) => updateField({ restDuration: value })}
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
              onChange={(value) => updateField({ countdownDuration: value })}
              formatValue={(value) => `${value}${t('settings.countdownUnit')}`}
              compact
            />
          </ConfigRow>

          <Text style={styles.totalLine}>
            <Text style={styles.totalLineLabel}>{t('settings.totalWorkout')}: </Text>
            <Text style={styles.totalLineValue}>{formatTime(totalSeconds)}</Text>
          </Text>

          {expanded ? (
            <View style={styles.expandedSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.presetRow}
              >
                {presets.map((preset) => {
                  const active = activePresetId === preset.id;
                  return (
                    <Pressable
                      key={preset.id}
                      style={[styles.presetChip, active && styles.presetChipActive]}
                      onPress={() => loadPreset(preset)}
                    >
                      <Text
                        style={[styles.presetChipText, active && styles.presetChipTextActive]}
                        numberOfLines={1}
                      >
                        {getPresetName(preset)}
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable style={styles.presetChipSave} onPress={openSaveInput}>
                  <Text style={styles.presetChipSaveText}>+ {t('settings.savePreset')}</Text>
                </Pressable>
              </ScrollView>

              {showDuration && targetMinutes !== null ? (
                <View style={styles.durationRow}>
                  <Text style={styles.durationLabel}>{t('settings.workoutDuration')}</Text>
                  <NumberStepper
                    label=""
                    value={targetMinutes}
                    min={5}
                    max={60}
                    step={5}
                    onChange={handleDurationChange}
                    formatValue={(value) => `${value}${t('settings.minutesShort')}`}
                    compact
                  />
                </View>
              ) : null}

              <Pressable style={styles.savePresetButton} onPress={openSaveInput}>
                <Text style={styles.savePresetButtonText}>
                  {t('settings.saveAsProgram').toUpperCase()}
                </Text>
              </Pressable>

              {showSaveInput ? (
                <View style={styles.saveRow}>
                  <TextInput
                    style={styles.saveInput}
                    value={saveInputName}
                    onChangeText={setSaveInputName}
                    placeholder={t('settings.presetName')}
                    placeholderTextColor={Colors.textMuted}
                    autoFocus
                    onSubmitEditing={() => {
                      void handleSave();
                    }}
                  />
                  <Pressable
                    style={styles.saveBtn}
                    onPress={() => {
                      void handleSave();
                    }}
                  >
                    <Text style={styles.saveBtnText}>✓</Text>
                  </Pressable>
                  <Pressable
                    style={styles.saveBtn}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setShowSaveInput(false);
                      setSaveInputName('');
                    }}
                  >
                    <Text style={styles.saveBtnText}>✕</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

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
      </ScrollView>

      <View style={[styles.startDock, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable style={styles.startBtn} onPress={handleStart}>
          <Text style={styles.startBtnText}>{t('settings.start').toUpperCase()}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
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
    marginBottom: 16,
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
  gearIconActive: {
    color: Colors.green,
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
  expandedSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.hairline,
    marginTop: 12,
    paddingTop: 14,
  },
  presetRow: {
    gap: 6,
    paddingBottom: 14,
  },
  presetChip: {
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 6,
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  presetChipActive: {
    borderColor: Colors.green,
    backgroundColor: 'rgba(57,255,20,0.1)',
  },
  presetChipText: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  presetChipTextActive: {
    color: Colors.green,
  },
  presetChipSave: {
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  presetChipSaveText: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: Colors.textMuted,
  },
  durationRow: {
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  durationLabel: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: Colors.textSecondary,
  },
  savePresetButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 12,
  },
  savePresetButtonText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 11,
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveInput: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  saveBtn: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 14,
    color: Colors.green,
  },
  recentSection: {
    marginBottom: 8,
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
  startDock: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.hairline,
    paddingHorizontal: 14,
    paddingTop: 12,
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
