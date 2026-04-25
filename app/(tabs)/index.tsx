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
  type LayoutChangeEvent,
} from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Href, useFocusEffect } from 'expo-router';
import { useWorkoutStore } from '@/store/workout-store';
import { useSettingsStore } from '@/store/settings-store';
import { NumberStepper } from '@/components/number-stepper';
import { DurationStepper } from '@/components/duration-stepper';
import { usePresets } from '@/hooks/use-presets';
import { Preset, TimerMode, WorkoutConfig } from '@/lib/types';
import { formatTime } from '@/lib/format';
import { Colors, FontFamily, FontSize } from '@/constants/theme';
import { triggerHaptic, triggerHapticEvent, triggerNotification } from '@/lib/haptics';
import { t } from '@/lib/i18n';

type PreviewPhase = 'countdown' | 'work' | 'rest';

interface PreviewBlock {
  id: string;
  phase: PreviewPhase;
  duration: number;
}

const PREVIEW_BLOCK_MIN_WIDTH = 6;
const PREVIEW_BLOCK_GAP = 2;
const PREVIEW_PHASE_COLORS: Record<PreviewPhase, string> = {
  countdown: '#FFB800',
  work: '#39FF14',
  rest: '#FF006E',
};

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

function buildPreviewBlocks(config: WorkoutConfig): PreviewBlock[] {
  const blocks: PreviewBlock[] = [
    { id: 'countdown', phase: 'countdown', duration: config.countdownDuration },
  ];

  for (let round = 1; round <= config.rounds; round += 1) {
    blocks.push({ id: `work-${round}`, phase: 'work', duration: config.workDuration });

    if (round < config.rounds) {
      blocks.push({ id: `rest-${round}`, phase: 'rest', duration: config.restDuration });
    }
  }

  return blocks;
}

function getPreviewBlockWidth(
  duration: number,
  totalSeconds: number,
  stripWidth: number,
  blockCount: number,
): number {
  if (totalSeconds <= 0 || stripWidth <= 0) {
    return PREVIEW_BLOCK_MIN_WIDTH;
  }

  const availableWidth = Math.max(0, stripWidth - blockCount * PREVIEW_BLOCK_GAP);
  return Math.max(PREVIEW_BLOCK_MIN_WIDTH, (duration / totalSeconds) * availableWidth);
}

function configureAccordionAnimation() {
  LayoutAnimation.configureNext({
    duration: 250,
    create: {
      type: LayoutAnimation.Types.easeOut,
      property: LayoutAnimation.Properties.opacity,
    },
    update: {
      type: LayoutAnimation.Types.easeOut,
    },
    delete: {
      type: LayoutAnimation.Types.easeOut,
      property: LayoutAnimation.Properties.opacity,
    },
  });
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
  const [previewStripWidth, setPreviewStripWidth] = useState(0);
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

  const isBoxing = mode === 'boxing';
  const roundsMax = isBoxing ? 50 : 30;
  const workMin = isBoxing ? 15 : 10;
  const workMax = isBoxing ? 900 : 120;
  const workStep = isBoxing ? 15 : 5;
  const restMax = isBoxing ? 300 : 60;

  const totalSeconds = useMemo(() => computeTotal(localConfig), [localConfig]);
  const previewBlocks = useMemo(() => buildPreviewBlocks(localConfig), [localConfig]);
  const workTotalSeconds = localConfig.rounds * localConfig.workDuration;
  const restTotalSeconds = Math.max(0, localConfig.rounds - 1) * localConfig.restDuration;

  const handlePreviewLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;

    setPreviewStripWidth((prev) => (prev === nextWidth ? prev : nextWidth));
  }, []);

  const handleModeSwitch = useCallback(
    (nextMode: TimerMode) => {
      if (nextMode === mode) return;
      triggerHaptic();
      if (expanded) {
        configureAccordionAnimation();
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
    triggerHapticEvent('start');
    loadConfig(localConfig, activePresetId);
    rememberLastConfig(localConfig);
    router.push('/timer' as Href);
  }, [activePresetId, loadConfig, localConfig, rememberLastConfig, router]);

  const handleAdvancedToggle = useCallback(() => {
    configureAccordionAnimation();
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
    configureAccordionAnimation();
    setShowSaveInput(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!saveInputName.trim()) return;
    await savePreset(saveInputName.trim(), localConfig);
    setSaveInputName('');
    setShowSaveInput(false);
    triggerNotification();
  }, [localConfig, saveInputName, savePreset]);

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

          <View style={styles.sessionPreview}>
            <View style={styles.sessionPreviewStrip} onLayout={handlePreviewLayout}>
              {previewBlocks.map((block) => (
                <View
                  key={block.id}
                  style={[
                    styles.sessionPreviewBlock,
                    {
                      width: getPreviewBlockWidth(
                        block.duration,
                        totalSeconds,
                        previewStripWidth,
                        previewBlocks.length,
                      ),
                      backgroundColor: PREVIEW_PHASE_COLORS[block.phase],
                    },
                  ]}
                />
              ))}
            </View>
            <Text
              style={styles.timeBreakdown}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              <Text style={styles.timeBreakdownValue}>{formatTime(workTotalSeconds)} </Text>
              <Text style={styles.timeBreakdownWorkLabel}>{t('config.work')}</Text>
              <Text style={styles.timeBreakdownSeparator}> · </Text>
              <Text style={styles.timeBreakdownValue}>{formatTime(restTotalSeconds)} </Text>
              <Text style={styles.timeBreakdownRestLabel}>{t('config.rest')}</Text>
              <Text style={styles.timeBreakdownSeparator}> · </Text>
              <Text style={styles.timeBreakdownValue}>{formatTime(totalSeconds)} </Text>
              <Text style={styles.timeBreakdownTotalLabel}>{t('config.total')}</Text>
            </Text>
          </View>

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
                      configureAccordionAnimation();
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

      </ScrollView>

      <View style={[styles.startDock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
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
  sessionPreview: {
    marginTop: 8,
    marginBottom: 4,
  },
  sessionPreviewStrip: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    overflow: 'hidden',
  },
  sessionPreviewBlock: {
    height: 12,
    marginRight: 2,
  },
  timeBreakdown: {
    marginTop: 6,
    textAlign: 'center',
    fontFamily: FontFamily.body,
    fontSize: 10,
  },
  timeBreakdownValue: {
    color: '#888',
  },
  timeBreakdownWorkLabel: {
    color: '#39FF14',
  },
  timeBreakdownRestLabel: {
    color: '#FF006E',
  },
  timeBreakdownTotalLabel: {
    color: '#888',
  },
  timeBreakdownSeparator: {
    color: '#333',
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
