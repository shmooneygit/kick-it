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
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { getSoundSchemeLabel } from '@/lib/format';
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
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 10, paddingBottom: insets.bottom },
      ]}
    >
      <Text style={styles.title}>{t('settingsScreen.title')}</Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.sectionLabel}>{t('settingsScreen.soundVibration').toUpperCase()}</Text>
        <View style={styles.group}>
          <View style={[styles.row, styles.rowDivider]}>
            <Text style={styles.label}>{t('settingsScreen.soundScheme')}</Text>
            <Text style={styles.valueAccent}>{getSoundSchemeLabel(settings.soundScheme)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t('settingsScreen.vibration')}</Text>
            <Switch
              value={settings.vibrationEnabled}
              onValueChange={(value) => update({ vibrationEnabled: value })}
              trackColor={{ false: Colors.toggleOff, true: Colors.green }}
              thumbColor={settings.vibrationEnabled ? Colors.background : Colors.toggleThumbOff}
            />
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
  valueMuted: {
    fontFamily: FontFamily.body,
    fontSize: 13,
    color: Colors.textMuted,
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
