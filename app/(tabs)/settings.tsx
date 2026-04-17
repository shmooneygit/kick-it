import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  StyleSheet,
} from 'react-native';
import Constants from 'expo-constants';
import { useCallback, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSound } from '@/hooks/use-sound';
import { getModeSoundLabelKey } from '@/lib/sounds';
import { AppSettings, TimerMode } from '@/lib/types';
import { useSettingsStore } from '@/store/settings-store';
import { usePresets } from '@/hooks/use-presets';
import { ConfirmSheet } from '@/components/confirm-sheet';
import { NumberStepper } from '@/components/number-stepper';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { t } from '@/lib/i18n';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const settings = useSettingsStore((s) => s.settings);
  const language = useSettingsStore((s) => s.language);
  const update = useSettingsStore((s) => s.update);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const { previewMode } = useSound();
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const { userPresets: boxingPresets, deletePreset: deleteBoxing } = usePresets('boxing');
  const { userPresets: tabataPresets, deletePreset: deleteTabata } = usePresets('tabata');
  const [presetToDelete, setPresetToDelete] = useState<{ id: string; name: string } | null>(null);
  const allUserPresets = useMemo(
    () => [...boxingPresets, ...tabataPresets],
    [boxingPresets, tabataPresets],
  );

  const handleLanguageSwitch = useCallback(
    (lang: 'uk' | 'en') => {
      void setLanguage(lang);
    },
    [setLanguage],
  );

  const handleHapticLevelChange = useCallback(
    (level: AppSettings['hapticLevel']) => {
      void update({ hapticLevel: level });
    },
    [update],
  );

  const handleDeletePreset = useCallback(
    (id: string, name: string) => {
      setPresetToDelete({ id, name });
    },
    [],
  );

  const confirmDeletePreset = useCallback(() => {
    if (!presetToDelete) {
      return;
    }

    const preset = allUserPresets.find((item) => item.id === presetToDelete.id);
    if (preset?.mode === 'boxing') {
      deleteBoxing(presetToDelete.id);
    } else if (preset?.mode === 'tabata') {
      deleteTabata(presetToDelete.id);
    }

    setPresetToDelete(null);
  }, [allUserPresets, deleteBoxing, deleteTabata, presetToDelete]);

  const handleSoundPreview = useCallback(
    (mode: TimerMode) => {
      previewMode(mode).catch((error) => {
        console.warn('[settings] sound preview failed:', error);
      });
    },
    [previewMode],
  );

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 10, paddingBottom: insets.bottom },
      ]}
    >
      <Text style={styles.title}>{t('settingsScreen.title')}</Text>

      <ConfirmSheet
        visible={!!presetToDelete}
        title={
          presetToDelete
            ? `${t('settings.delete')} "${presetToDelete.name}"?`
            : t('settings.confirmDelete')
        }
        confirmLabel={t('settings.delete').toUpperCase()}
        cancelLabel={t('settings.cancel').toUpperCase()}
        confirmTone="danger"
        onConfirm={confirmDeletePreset}
        onCancel={() => setPresetToDelete(null)}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.sectionLabel}>{t('settingsScreen.soundVibration').toUpperCase()}</Text>
        <View style={styles.group}>
          <View style={[styles.row, styles.rowDivider]}>
            <Text style={styles.label}>{t('home.boxing')}</Text>
            <View style={styles.valueRow}>
              <Text style={styles.valueAccent}>{t(getModeSoundLabelKey('boxing'))}</Text>
              <Pressable
                style={styles.previewButton}
                onPress={() => handleSoundPreview('boxing')}
              >
                <Text style={styles.previewButtonText}>{t('settingsScreen.testSound')}</Text>
              </Pressable>
            </View>
          </View>
          <View style={[styles.row, styles.rowDivider]}>
            <Text style={styles.label}>{t('home.tabata')}</Text>
            <View style={styles.valueRow}>
              <Text style={styles.valueAccent}>{t(getModeSoundLabelKey('tabata'))}</Text>
              <Pressable
                style={styles.previewButton}
                onPress={() => handleSoundPreview('tabata')}
              >
                <Text style={styles.previewButtonText}>{t('settingsScreen.testSound')}</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t('settingsScreen.hapticFeedback')}</Text>
            <View style={styles.hapticSegmented}>
              {(['off', 'light', 'strong'] as const).map((level) => (
                <Pressable
                  key={level}
                  style={[
                    styles.hapticSegment,
                    settings.hapticLevel === level && styles.hapticSegmentActive,
                  ]}
                  onPress={() => handleHapticLevelChange(level)}
                >
                  <Text
                    style={[
                      styles.hapticSegmentText,
                      settings.hapticLevel === level && styles.hapticSegmentTextActive,
                    ]}
                  >
                    {t(`settingsScreen.${level}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>{t('settingsScreen.timerSection').toUpperCase()}</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <Text style={styles.label}>{t('settingsScreen.defaultCountdown')}</Text>
            <NumberStepper
              label=""
              value={settings.defaultCountdown}
              min={5}
              max={30}
              step={5}
              onChange={(value) => update({ defaultCountdown: value })}
              formatValue={(value) => `${value}${t('settings.countdownUnit')}`}
              compact
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>{t('settingsScreen.language').toUpperCase()}</Text>
        <View style={styles.group}>
          <View style={styles.segmented}>
            <Pressable
              style={[styles.segment, language === 'uk' && styles.segmentActive]}
              onPress={() => handleLanguageSwitch('uk')}
            >
              <Text style={[styles.segmentText, language === 'uk' && styles.segmentTextActive]}>
                УКР
              </Text>
            </Pressable>
            <Pressable
              style={[styles.segment, language === 'en' && styles.segmentActive]}
              onPress={() => handleLanguageSwitch('en')}
            >
              <Text style={[styles.segmentText, language === 'en' && styles.segmentTextActive]}>
                ENG
              </Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionLabel}>{t('settingsScreen.myPrograms').toUpperCase()}</Text>
        <View style={styles.group}>
          {allUserPresets.length === 0 ? (
            <View style={styles.row}>
              <Text style={styles.emptyText}>{t('settings.noPresets')}</Text>
            </View>
          ) : (
            allUserPresets.map((preset, index) => {
              const locale = language === 'uk' ? 'uk' : 'en';
              const name = preset.name[locale] || preset.name.en;
              return (
                <View
                  key={preset.id}
                  style={[styles.row, index < allUserPresets.length - 1 && styles.rowDivider]}
                >
                  <Text style={styles.label}>{name}</Text>
                  <Pressable onPress={() => handleDeletePreset(preset.id, name)}>
                    <Text style={styles.deleteText}>{t('settings.delete')}</Text>
                  </Pressable>
                </View>
              );
            })
          )}
        </View>

        <Text style={styles.sectionLabel}>{t('settingsScreen.about').toUpperCase()}</Text>
        <View style={styles.group}>
          <View style={[styles.row, styles.rowDivider]}>
            <Text style={styles.label}>{t('settingsScreen.version')}</Text>
            <Text style={styles.valueMuted}>{appVersion}</Text>
          </View>
          <Pressable
            style={styles.row}
            onPress={() => {
              Linking.openURL('mailto:mishamoskalenko@icloud.com').catch((error) => {
                console.warn('[settings] openURL failed:', error);
              });
            }}
          >
            <Text style={styles.label}>{t('settingsScreen.contactDev')}</Text>
            <Text style={styles.valueAccent}>→</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 16,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  sectionLabel: {
    fontFamily: FontFamily.body,
    fontSize: 9,
    color: Colors.textMeta,
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 14,
  },
  group: {
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 2,
  },
  row: {
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.hairline,
  },
  label: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  valueAccent: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 13,
    color: Colors.green,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valueMuted: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: Colors.textMuted,
  },
  previewButton: {
    borderWidth: 1,
    borderColor: Colors.green,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  previewButtonText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 11,
    color: Colors.green,
    letterSpacing: 0.4,
  },
  hapticSegmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hapticSegment: {
    minWidth: 58,
    minHeight: 36,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  hapticSegmentActive: {
    backgroundColor: Colors.green,
  },
  hapticSegmentText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: Colors.textMeta,
    letterSpacing: 0.8,
  },
  hapticSegmentTextActive: {
    color: Colors.background,
  },
  segmented: {
    flexDirection: 'row',
  },
  segment: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  segmentActive: {
    backgroundColor: Colors.green,
  },
  segmentText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 10,
    color: Colors.textMeta,
    letterSpacing: 1,
  },
  segmentTextActive: {
    color: Colors.background,
  },
  deleteText: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: Colors.pink,
  },
  emptyText: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: Colors.textMuted,
  },
});
