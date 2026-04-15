import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  StyleSheet,
} from 'react-native';
import { useState, useMemo, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Href, useFocusEffect } from 'expo-router';
import { useWorkoutStore } from '@/store/workout-store';
import { useSettingsStore } from '@/store/settings-store';
import { triggerHaptic, triggerNotification } from '@/lib/haptics';
import { usePresets } from '@/hooks/use-presets';
import { TimerMode, Preset } from '@/lib/types';
import { t } from '@/lib/i18n';
import {
  Colors,
  FontFamily,
  FontSize,
  Spacing,
} from '@/constants/theme';
import { getSoundSchemeLabel } from '@/lib/format';
import { NumberStepper } from './number-stepper';
import { DurationStepper } from './duration-stepper';
import { NeonButton } from './neon-button';
import { SoundPicker } from './sound-picker';

interface SettingsFormProps {
  mode: TimerMode;
}

function formatTotalTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}:${rm.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function SettingsForm({ mode }: SettingsFormProps) {
  useSettingsStore((s) => s.language);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const config = useWorkoutStore((s) => s.config);
  const setConfig = useWorkoutStore((s) => s.setConfig);
  const resetConfig = useWorkoutStore((s) => s.resetConfig);
  const loadConfig = useWorkoutStore((s) => s.loadConfig);
  const activePresetId = useWorkoutStore((s) => s.activePresetId);
  const setActivePresetId = useWorkoutStore((s) => s.setActivePresetId);
  const { presets, savePreset, deletePreset, getPresetName } = usePresets(mode);

  const [showDuration, setShowDuration] = useState(false);
  const [targetMinutes, setTargetMinutes] = useState<number | null>(null);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveInputName, setSaveInputName] = useState('');
  const [showSoundPicker, setShowSoundPicker] = useState(false);

  const isBoxing = mode === 'boxing';
  const roundsMax = isBoxing ? 50 : 30;
  const workMin = isBoxing ? 15 : 10;
  const workMax = isBoxing ? 900 : 120;
  const workStep = isBoxing ? 15 : 5;
  const restMax = isBoxing ? 300 : 60;

  useFocusEffect(
    useCallback(() => {
      const state = useWorkoutStore.getState();

      if (state.config.mode !== mode) {
        resetConfig(mode);
        setShowDuration(false);
        setTargetMinutes(null);
        return undefined;
      }

      loadConfig(state.config, state.activePresetId);

      if (state.activePresetId) {
        const totalSec = state.config.rounds * (state.config.workDuration + state.config.restDuration);
        setShowDuration(true);
        setTargetMinutes(Math.max(5, Math.round(totalSec / 60)));
      } else {
        setShowDuration(false);
        setTargetMinutes(null);
      }

      return undefined;
    }, [loadConfig, mode, resetConfig]),
  );

  const totalSeconds = useMemo(() => {
    return (
      config.countdownDuration +
      config.rounds * config.workDuration +
      (config.rounds - 1) * config.restDuration
    );
  }, [config.rounds, config.workDuration, config.restDuration, config.countdownDuration]);

  const loadPreset = useCallback(
    (preset: Preset) => {
      setConfig({
        rounds: preset.rounds,
        workDuration: preset.workDuration,
        restDuration: preset.restDuration,
        countdownDuration: preset.countdownDuration,
        soundScheme: preset.soundScheme,
      });
      setActivePresetId(preset.id);
      setShowDuration(true);
      const totalSec = preset.rounds * (preset.workDuration + preset.restDuration);
      setTargetMinutes(Math.round(totalSec / 60));
      triggerHaptic();
    },
    [setActivePresetId, setConfig],
  );

  const handleDurationChange = useCallback(
    (minutes: number) => {
      setTargetMinutes(minutes);
      const targetSeconds = minutes * 60;
      const cycleDuration = config.workDuration + config.restDuration;
      const newRounds = Math.max(
        1,
        Math.round(
          (targetSeconds - config.countdownDuration + config.restDuration) / cycleDuration,
        ),
      );
      setConfig({ rounds: newRounds });
      setActivePresetId(null);
    },
    [
      config.workDuration,
      config.restDuration,
      config.countdownDuration,
      setActivePresetId,
      setConfig,
    ],
  );

  const handleDeletePreset = useCallback(
    (preset: Preset) => {
      if (preset.isBuiltIn) return;
      Alert.alert(t('settings.confirmDelete'), getPresetName(preset), [
        { text: t('settings.cancel'), style: 'cancel' },
        {
          text: t('settings.delete'),
          style: 'destructive',
          onPress: () => {
            deletePreset(preset.id);
            if (activePresetId === preset.id) {
              setActivePresetId(null);
              setShowDuration(false);
            }
          },
        },
      ]);
    },
    [activePresetId, deletePreset, getPresetName, setActivePresetId],
  );

  const handleSave = useCallback(async () => {
    if (!saveInputName.trim()) return;
    await savePreset(saveInputName.trim(), config);
    setSaveInputName('');
    setShowSaveInput(false);
    triggerNotification();
  }, [saveInputName, savePreset, config]);

  const handleStart = () => {
    triggerNotification();
    useWorkoutStore.getState().rememberLastConfig(config);
    router.push('/timer' as Href);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>
          {isBoxing ? t('home.boxingTimer').toUpperCase() : t('home.tabataTimer').toUpperCase()}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View>
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
                  onLongPress={() => {
                    if (!preset.isBuiltIn) handleDeletePreset(preset);
                  }}
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
            <Pressable style={styles.presetChipSave} onPress={() => setShowSaveInput(true)}>
              <Text style={styles.presetChipSaveText}>+ {t('settings.savePreset')}</Text>
            </Pressable>
          </ScrollView>

          {showSaveInput && (
            <View style={styles.saveRow}>
              <TextInput
                style={styles.saveInput}
                value={saveInputName}
                onChangeText={setSaveInputName}
                placeholder={t('settings.presetName')}
                placeholderTextColor={Colors.textMuted}
                autoFocus
                onSubmitEditing={handleSave}
              />
              <Pressable style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>✓</Text>
              </Pressable>
              <Pressable
                style={styles.saveBtn}
                onPress={() => {
                  setShowSaveInput(false);
                  setSaveInputName('');
                }}
              >
                <Text style={styles.saveBtnText}>✕</Text>
              </Pressable>
            </View>
          )}

          {showDuration && targetMinutes !== null && (
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
          )}

          <View style={styles.grid}>
            <View style={styles.gridCell}>
              <NumberStepper
                label={isBoxing ? t('settings.rounds') : t('settings.intervals')}
                value={config.rounds}
                min={1}
                max={roundsMax}
                onChange={(v) => {
                  setConfig({ rounds: v });
                  setActivePresetId(null);
                }}
                compact
              />
            </View>
            <View style={styles.gridCell}>
              <DurationStepper
                label={isBoxing ? t('settings.roundDuration') : t('settings.workDuration')}
                value={config.workDuration}
                min={workMin}
                max={workMax}
                step={workStep}
                onChange={(v) => {
                  setConfig({ workDuration: v });
                  setActivePresetId(null);
                }}
                compact
              />
            </View>
            <View style={styles.gridCell}>
              <DurationStepper
                label={t('settings.restDuration')}
                value={config.restDuration}
                min={5}
                max={restMax}
                step={5}
                onChange={(v) => {
                  setConfig({ restDuration: v });
                  setActivePresetId(null);
                }}
                compact
              />
            </View>
            <View style={styles.gridCell}>
              <NumberStepper
                label={t('settings.countdown')}
                value={config.countdownDuration}
                min={5}
                max={30}
                step={5}
                onChange={(v) => {
                  setConfig({ countdownDuration: v });
                  setActivePresetId(null);
                }}
                formatValue={(v) => `${v}${t('settings.countdownUnit')}`}
                compact
              />
            </View>
          </View>

          {!isBoxing && (
            <View style={styles.toggleRow}>
              <Pressable style={styles.soundCard} onPress={() => setShowSoundPicker(true)}>
                <Text style={styles.toggleLabel}>{t('settings.soundScheme').toUpperCase()}</Text>
                <View style={styles.soundValueRow}>
                  <Text style={styles.soundValue}>{getSoundSchemeLabel(config.soundScheme)}</Text>
                  <Text style={styles.soundChevron}>▾</Text>
                </View>
              </Pressable>
            </View>
          )}

          <Text style={styles.totalLine}>
            <Text style={styles.totalLabel}>{t('settings.totalWorkout')}: </Text>
            <Text style={styles.totalValue}>{formatTotalTime(totalSeconds)}</Text>
          </Text>
        </View>

        <View style={[styles.startContainer, { paddingBottom: insets.bottom + 8 }]}>
          <NeonButton
            title={t('settings.start').toUpperCase()}
            onPress={handleStart}
            color={Colors.green}
            fullWidth
          />
        </View>
      </View>

      {!isBoxing && (
        <SoundPicker
          visible={showSoundPicker}
          currentScheme={config.soundScheme}
          onSelect={(scheme) => {
            setConfig({ soundScheme: scheme });
            setActivePresetId(null);
            triggerHaptic();
          }}
          onClose={() => setShowSoundPicker(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    height: 40,
    marginBottom: 10,
  },
  backArrow: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 16,
    color: Colors.green,
  },
  headerTitle: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
    letterSpacing: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
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
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  gridCell: {
    width: '48%',
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 8,
  },
  toggleRow: {
    marginBottom: 14,
  },
  soundCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toggleLabel: {
    fontFamily: FontFamily.body,
    fontSize: 9,
    color: Colors.textMeta,
    letterSpacing: 1,
    marginBottom: 8,
  },
  soundValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  soundValue: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  soundChevron: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  totalLine: {
    textAlign: 'center',
    fontFamily: FontFamily.body,
    fontSize: 11,
  },
  totalLabel: {
    color: Colors.textMeta,
  },
  totalValue: {
    color: Colors.textSecondary,
  },
  startContainer: {
    paddingTop: 16,
  },
});
