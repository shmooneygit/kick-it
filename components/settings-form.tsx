import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  TextInput,
  Alert,
  StyleSheet,
} from 'react-native';
import { useState, useMemo, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Href } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useWorkoutStore } from '@/store/workout-store';
import { useSettingsStore } from '@/store/settings-store';
import { triggerHaptic, triggerNotification } from '@/lib/haptics';
import { usePresets } from '@/hooks/use-presets';
import { TimerMode, SoundScheme, Preset } from '@/lib/types';
import { t } from '@/lib/i18n';
import {
  Colors,
  FontFamily,
  FontSize,
  BorderRadius,
  Spacing,
  neonGlow,
} from '@/constants/theme';
import { NumberStepper } from './number-stepper';
import { DurationStepper } from './duration-stepper';
import { NeonButton } from './neon-button';

interface SettingsFormProps {
  mode: TimerMode;
}

const SOUND_SCHEMES: { key: SoundScheme; labelKey: string }[] = [
  { key: 'bell', labelKey: 'settings.bell' },
  { key: 'beep', labelKey: 'settings.beep' },
  { key: 'whistle', labelKey: 'settings.whistle' },
];

const DURATION_OPTIONS = [5, 10, 15, 20, 25, 30, 45, 60];

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
  useSettingsStore((s) => s.settings.language);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const config = useWorkoutStore((s) => s.config);
  const setConfig = useWorkoutStore((s) => s.setConfig);
  const activePresetId = useWorkoutStore((s) => s.activePresetId);
  const setActivePresetId = useWorkoutStore((s) => s.setActivePresetId);
  const { presets, savePreset, deletePreset, getPresetName } = usePresets(mode);

  const [showDuration, setShowDuration] = useState(false);
  const [targetMinutes, setTargetMinutes] = useState<number | null>(null);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveInputName, setSaveInputName] = useState('');

  const isBoxing = mode === 'boxing';

  // Calculate total workout time
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
        announceRounds: preset.announceRounds,
        soundScheme: preset.soundScheme,
      });
      setActivePresetId(preset.id);
      setShowDuration(true);
      // Calculate nearest duration option
      const totalSec = preset.rounds * (preset.workDuration + preset.restDuration);
      const nearestMin = Math.round(totalSec / 60);
      setTargetMinutes(nearestMin);
      triggerHaptic();
    },
    [setActivePresetId, setConfig],
  );

  const handleDurationChange = useCallback(
    (minutes: number) => {
      setTargetMinutes(minutes);
      const cycleDuration = config.workDuration + config.restDuration;
      const newRounds = Math.max(1, Math.round((minutes * 60) / cycleDuration));
      setConfig({ rounds: newRounds });
      setActivePresetId(null);
    },
    [config.workDuration, config.restDuration, setActivePresetId, setConfig],
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
    router.push('/timer' as Href);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header - compact */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={28}
            color={Colors.textPrimary}
          />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isBoxing ? t('home.boxingTimer').toUpperCase() : t('home.tabataTimer').toUpperCase()}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Content area - fills between header and start button */}
      <View style={styles.content}>
        {/* Preset chips - horizontal scroll */}
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
                  <Text style={styles.presetIcon}>{preset.icon}</Text>
                  <Text
                    style={[
                      styles.presetChipText,
                      active && styles.presetChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {getPresetName(preset)}
                  </Text>
                </Pressable>
              );
            })}
            {/* Save chip */}
            <Pressable
              style={styles.presetChipSave}
              onPress={() => setShowSaveInput(true)}
            >
              <Text style={styles.presetChipText}>+ {t('settings.savePreset')}</Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* Save input row */}
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
              <MaterialCommunityIcons name="check" size={20} color={Colors.neonGreen} />
            </Pressable>
            <Pressable
              style={styles.saveBtn}
              onPress={() => { setShowSaveInput(false); setSaveInputName(''); }}
            >
              <MaterialCommunityIcons name="close" size={20} color={Colors.textMuted} />
            </Pressable>
          </View>
        )}

        {/* Duration override (shown after loading a preset) */}
        {showDuration && targetMinutes !== null && (
          <View style={styles.durationRow}>
            <Text style={styles.durationLabel}>{t('settings.workoutDuration')}:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.durationOptions}
            >
              {DURATION_OPTIONS.map((min) => {
                const active = targetMinutes === min;
                return (
                  <Pressable
                    key={min}
                    style={[styles.durationChip, active && styles.durationChipActive]}
                    onPress={() => handleDurationChange(min)}
                  >
                    <Text
                      style={[
                        styles.durationChipText,
                        active && styles.durationChipTextActive,
                      ]}
                    >
                      {min} {t('settings.minutesShort')}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Settings grid - 2 columns */}
        <View style={styles.grid}>
          {/* Row 1: Rounds + Work Duration */}
          <View style={styles.gridCell}>
            <NumberStepper
              label={isBoxing ? t('settings.rounds') : t('settings.intervals')}
              value={config.rounds}
              min={1}
              max={50}
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
              min={isBoxing ? 30 : 5}
              max={isBoxing ? 600 : 300}
              step={isBoxing ? 15 : 5}
              onChange={(v) => {
                setConfig({ workDuration: v });
                setActivePresetId(null);
              }}
              compact
            />
          </View>

          {/* Row 2: Rest Duration + Countdown */}
          <View style={styles.gridCell}>
            <DurationStepper
              label={t('settings.restDuration')}
              value={config.restDuration}
              min={isBoxing ? 10 : 5}
              max={300}
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
              min={3}
              max={30}
              onChange={(v) => {
                setConfig({ countdownDuration: v });
                setActivePresetId(null);
              }}
              formatValue={(v) => `${v}${t('settings.countdownUnit')}`}
              compact
            />
          </View>
        </View>

        {/* Toggles row: announce + sound scheme */}
        <View style={styles.togglesRow}>
          <View style={styles.toggleItem}>
            <Text style={styles.toggleLabel}>🔊 {t('settings.announceRounds')}</Text>
            <Switch
              value={config.announceRounds}
              onValueChange={(v) => {
                setConfig({ announceRounds: v });
                setActivePresetId(null);
              }}
              trackColor={{ false: Colors.surface, true: Colors.neonCyan + '55' }}
              thumbColor={config.announceRounds ? Colors.neonCyan : Colors.textMuted}
              style={styles.switchSmall}
            />
          </View>
          <View style={styles.soundRow}>
            <Text style={styles.toggleLabel}>🔔</Text>
            {SOUND_SCHEMES.map(({ key, labelKey }) => {
              const selected = config.soundScheme === key;
              return (
                <Pressable
                  key={key}
                  style={[styles.soundPill, selected && styles.soundPillSelected]}
                  onPress={() => {
                    setConfig({ soundScheme: key });
                    setActivePresetId(null);
                    triggerHaptic();
                  }}
                >
                  <Text
                    style={[
                      styles.soundPillText,
                      selected && styles.soundPillTextSelected,
                    ]}
                  >
                    {t(labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Total workout info */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{t('settings.totalWorkout')}:</Text>
          <Text style={styles.totalValue}>{formatTotalTime(totalSeconds)}</Text>
          <Text style={styles.totalDetail}>
            ({config.rounds} {isBoxing ? t('settings.roundsCalculated') : t('settings.intervalsCalculated')})
          </Text>
        </View>
      </View>

      {/* START button - always at bottom */}
      <View style={[styles.startContainer, { paddingBottom: insets.bottom + 8 }]}>
        <NeonButton
          title={t('settings.start')}
          onPress={handleStart}
          color={Colors.neonGreen}
          fullWidth
        />
      </View>
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
    paddingVertical: Spacing.sm,
  },
  headerTitle: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    justifyContent: 'space-evenly',
  },
  // Preset chips
  presetRow: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  presetChipActive: {
    borderColor: Colors.neonCyan,
    backgroundColor: Colors.neonCyan + '18',
  },
  presetIcon: {
    fontSize: 14,
  },
  presetChipText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  presetChipTextActive: {
    color: Colors.neonCyan,
  },
  presetChipSave: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.neonCyan + '44',
    borderStyle: 'dashed',
  },
  // Save input
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  saveInput: {
    flex: 1,
    height: 36,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  saveBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Duration override
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  durationLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  durationOptions: {
    gap: Spacing.xs,
  },
  durationChip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 1,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  durationChipActive: {
    borderColor: Colors.neonAmber,
    backgroundColor: Colors.neonAmber + '18',
  },
  durationChipText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  durationChipTextActive: {
    color: Colors.neonAmber,
  },
  // Settings grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  gridCell: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
  },
  // Toggles
  togglesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  toggleLabel: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  switchSmall: {
    transform: [{ scale: 0.85 }],
  },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  soundPill: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 1,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  soundPillSelected: {
    borderColor: Colors.neonCyan,
    backgroundColor: Colors.neonCyan + '22',
  },
  soundPillText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  soundPillTextSelected: {
    color: Colors.neonCyan,
  },
  // Total
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  totalLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  totalValue: {
    fontFamily: FontFamily.timer,
    fontSize: FontSize.xl,
    color: Colors.neonAmber,
    ...neonGlow(Colors.neonAmber, 8),
  },
  totalDetail: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  // Start button
  startContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
});
