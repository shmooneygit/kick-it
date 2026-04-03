import { View, Text, Pressable, Switch, Alert, FlatList, StyleSheet } from 'react-native';
import { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSettingsStore } from '@/store/settings-store';
import { usePresets } from '@/hooks/use-presets';
import { SoundScheme } from '@/lib/types';
import { NumberStepper } from '@/components/number-stepper';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius } from '@/constants/theme';
import i18n, { t } from '@/lib/i18n';

const SOUND_SCHEMES: { key: SoundScheme; labelKey: string }[] = [
  { key: 'bell', labelKey: 'settings.bell' },
  { key: 'beep', labelKey: 'settings.beep' },
  { key: 'whistle', labelKey: 'settings.whistle' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, update } = useSettingsStore();
  const { userPresets: boxingPresets, deletePreset: deleteBoxing } = usePresets('boxing');
  const { userPresets: tabataPresets, deletePreset: deleteTabata } = usePresets('tabata');
  const allUserPresets = [...boxingPresets, ...tabataPresets];

  const handleLanguageSwitch = useCallback(
    (lang: 'uk' | 'en') => {
      update({ language: lang });
    },
    [update],
  );

  const handleDeletePreset = useCallback(
    (id: string, name: string) => {
      Alert.alert(t('settings.confirmDelete'), name, [
        { text: t('settings.cancel'), style: 'cancel' },
        {
          text: t('settings.delete'),
          style: 'destructive',
          onPress: () => {
            if (id.includes('boxing')) deleteBoxing(id);
            else deleteTabata(id);
          },
        },
      ]);
    },
    [deleteBoxing, deleteTabata],
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom }]}>
      <Text style={styles.title}>{t('settingsScreen.title')}</Text>

      <FlatList
        data={[1]}
        keyExtractor={() => 'settings'}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        renderItem={() => (
          <View>
            {/* Sound & Vibration */}
            <Text style={styles.sectionLabel}>{t('settingsScreen.soundVibration')}</Text>
            <View style={styles.card}>
              {/* Sound scheme */}
              <View style={[styles.row, styles.rowDivider]}>
                <Text style={styles.label}>🔔 {t('settingsScreen.soundScheme')}</Text>
                <View style={styles.pillRow}>
                  {SOUND_SCHEMES.map(({ key, labelKey }) => {
                    const selected = settings.soundScheme === key;
                    return (
                      <Pressable
                        key={key}
                        style={[styles.pill, selected && styles.pillActive]}
                        onPress={() => update({ soundScheme: key })}
                      >
                        <Text style={[styles.pillText, selected && styles.pillTextActive]}>
                          {t(labelKey)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Announce */}
              <View style={[styles.toggleRow, styles.rowDivider]}>
                <Text style={styles.label}>🔊 {t('settings.announceRounds')}</Text>
                <Switch
                  value={settings.announceRounds}
                  onValueChange={(v) => update({ announceRounds: v })}
                  trackColor={{ false: Colors.surfaceLight, true: Colors.neonCyan }}
                  thumbColor={settings.announceRounds ? Colors.textPrimary : Colors.textMuted}
                />
              </View>

              {/* Vibration */}
              <View style={styles.toggleRow}>
                <Text style={styles.label}>📳 {t('settingsScreen.vibration')}</Text>
                <Switch
                  value={settings.vibrationEnabled}
                  onValueChange={(v) => update({ vibrationEnabled: v })}
                  trackColor={{ false: Colors.surfaceLight, true: Colors.neonCyan }}
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
                min={3}
                max={30}
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
                  style={[styles.langPill, settings.language === 'uk' && styles.langPillActive]}
                  onPress={() => handleLanguageSwitch('uk')}
                >
                  <Text style={[styles.langText, settings.language === 'uk' && styles.langTextActive]}>
                    🇺🇦 Українська
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.langPill, settings.language === 'en' && styles.langPillActive]}
                  onPress={() => handleLanguageSwitch('en')}
                >
                  <Text style={[styles.langText, settings.language === 'en' && styles.langTextActive]}>
                    🇬🇧 English
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
                  const locale = i18n.locale === 'uk' ? 'uk' : 'en';
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
                <Text style={styles.aboutValue}>Fight Timer v1.0</Text>
              </View>
              <View style={styles.toggleRow}>
                <Text style={styles.label}>{t('settingsScreen.contactDev')}</Text>
                <Text style={styles.contactLink}>›</Text>
              </View>
            </View>
          </View>
        )}
      />
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
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
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
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceLight,
  },
  pillActive: {
    borderColor: Colors.neonCyan,
  },
  pillText: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    color: Colors.textMuted,
  },
  pillTextActive: {
    color: Colors.neonCyan,
  },
  langPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
  },
  langPillActive: {
    backgroundColor: Colors.neonCyan,
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
    color: Colors.neonCyan,
  },
});
