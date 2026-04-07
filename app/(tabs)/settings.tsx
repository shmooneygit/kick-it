import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  Linking,
  StyleSheet,
} from 'react-native';
import Constants from 'expo-constants';
import { useCallback, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore } from '@/store/settings-store';
import { usePresets } from '@/hooks/use-presets';
import { NumberStepper } from '@/components/number-stepper';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius } from '@/constants/theme';
import { t } from '@/lib/i18n';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const settings = useSettingsStore((s) => s.settings);
  const language = useSettingsStore((s) => s.language);
  const update = useSettingsStore((s) => s.update);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const { userPresets: boxingPresets, deletePreset: deleteBoxing } = usePresets('boxing');
  const { userPresets: tabataPresets, deletePreset: deleteTabata } = usePresets('tabata');
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

  const handleDeletePreset = useCallback(
    (id: string, name: string) => {
      Alert.alert(t('settings.confirmDelete'), name, [
        { text: t('settings.cancel'), style: 'cancel' },
        {
          text: t('settings.delete'),
          style: 'destructive',
          onPress: () => {
            const preset = allUserPresets.find((item) => item.id === id);
            if (preset?.mode === 'boxing') deleteBoxing(id);
            else if (preset?.mode === 'tabata') deleteTabata(id);
          },
        },
      ]);
    },
    [allUserPresets, deleteBoxing, deleteTabata],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom }]}>
      <Text style={styles.title}>{t('settingsScreen.title')}</Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View>
            {/* Sound & Vibration */}
            <Text style={styles.sectionLabel}>{t('settingsScreen.soundVibration')}</Text>
            <View style={styles.card}>
              {/* Vibration */}
              <View style={styles.toggleRow}>
                <Text style={styles.label}>📳 {t('settingsScreen.vibration')}</Text>
                <Switch
                  value={settings.vibrationEnabled}
                  onValueChange={(v) => update({ vibrationEnabled: v })}
                  trackColor={{ false: Colors.surfaceLight, true: Colors.cyan }}
                  thumbColor={settings.vibrationEnabled ? Colors.textPrimary : Colors.textMuted}
                />
              </View>
            </View>

            {/* Timer */}
            <Text style={styles.sectionLabel}>{t('settingsScreen.timerSection')}</Text>
            <View style={styles.card}>
              <NumberStepper
                label={t('settingsScreen.defaultCountdown')}
                value={settings.defaultCountdown}
                min={5}
                max={30}
                step={5}
                onChange={(v) => update({ defaultCountdown: v })}
                formatValue={(v) => `${v}${t('settings.countdownUnit')}`}
                compact
              />
            </View>

            {/* Language */}
            <Text style={styles.sectionLabel}>{t('settingsScreen.language')}</Text>
            <View style={styles.card}>
              <View style={styles.pillRow}>
                <Pressable
                  style={[styles.langPill, language === 'uk' && styles.langPillActive]}
                  onPress={() => handleLanguageSwitch('uk')}
                >
                  <Text style={[styles.langText, language === 'uk' && styles.langTextActive]}>
                    🇺🇦 {t('settingsScreen.languageUkrainian')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.langPill, language === 'en' && styles.langPillActive]}
                  onPress={() => handleLanguageSwitch('en')}
                >
                  <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>
                    🇬🇧 {t('settingsScreen.languageEnglish')}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* User Presets */}
            <Text style={styles.sectionLabel}>{t('settingsScreen.myPrograms')}</Text>
            {allUserPresets.length === 0 ? (
              <Text style={styles.emptyText}>{t('settings.noPresets')}</Text>
            ) : (
              <View style={styles.card}>
                {allUserPresets.map((preset) => {
                  const locale = language === 'uk' ? 'uk' : 'en';
                  const name = preset.name[locale] || preset.name.en;
                  return (
                    <View
                      key={preset.id}
                      style={styles.presetItem}
                    >
                      <Text style={styles.presetIcon}>{preset.icon}</Text>
                      <Text style={styles.presetName}>{name}</Text>
                      <Pressable onPress={() => handleDeletePreset(preset.id, name)}>
                        <Text style={styles.deleteText}>{t('settings.delete')}</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}

            {/* About */}
            <Text style={styles.sectionLabel}>{t('settingsScreen.about')}</Text>
            <View style={styles.card}>
              <View style={[styles.toggleRow, styles.rowDivider]}>
                <Text style={styles.label}>{t('settingsScreen.version')}</Text>
                <Text style={styles.aboutValue}>{t('settingsScreen.versionValue', { version: appVersion })}</Text>
              </View>
              <Pressable
                style={styles.toggleRow}
                onPress={() => {
                  Linking.openURL('mailto:mishamoskalenko@icloud.com').catch((error) => { console.warn('[settings] openURL failed:', error); });
                }}
              >
                <Text style={styles.label}>{t('settingsScreen.contactDev')}</Text>
                <Text style={styles.contactLink}>›</Text>
              </Pressable>
            </View>
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
  contentContainer: {
    paddingBottom: 24,
  },
  title: {
    fontFamily: FontFamily.heading,
    fontSize: 18,
    color: Colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionLabel: {
    fontFamily: FontFamily.body,
    fontSize: 11,
    color: Colors.textMuted,
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
  },
  label: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceLight,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pillRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  langPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
  },
  langPillActive: {
    backgroundColor: Colors.cyan,
  },
  langText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 14,
    color: Colors.textMuted,
  },
  langTextActive: {
    color: Colors.background,
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceLight,
  },
  presetIcon: {
    fontSize: 18,
    marginRight: Spacing.sm,
  },
  presetName: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  deleteText: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    color: Colors.pink,
  },
  emptyText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  aboutValue: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    color: Colors.textMuted,
  },
  contactLink: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: 16,
    color: Colors.cyan,
  },
});
