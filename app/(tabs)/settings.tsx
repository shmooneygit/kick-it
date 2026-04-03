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
        renderItem={() => (
          <View>
            {/* Sound & Vibration */}
            <Text style={styles.sectionLabel}>{t('settingsScreen.soundVibration')}</Text>
            <View style={styles.card}>
              {/* Sound scheme */}
              <View style={styles.row}>
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
              <View style={styles.toggleRow}>
                <Text style={styles.label}>🔊 {t('settings.announceRounds')}</Text>
                <Switch
                  value={settings.announceRounds}
                  onValueChange={(v) => update({ announceRounds: v })}
                  trackColor={{ false: Colors.surface, true: Colors.neonCyan + '55' }}
                  thumbColor={settings.announceRounds ? Colors.neonCyan : Colors.textMuted}
                />
              </View>

              {/* Vibration */}
              <View style={styles.toggleRow}>
                <Text style={styles.label}>📳 {t('settingsScreen.vibration')}</Text>
                <Switch
                  value={settings.vibrationEnabled}
                  onValueChange={(v) => update({ vibrationEnabled: v })}
                  trackColor={{ false: Colors.surface, true: Colors.neonCyan + '55' }}
                  thumbColor={settings.vibrationEnabled ? Colors.neonCyan : Colors.textMuted}
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
                    <Pressable
                      key={preset.id}
                      style={styles.presetItem}
                      onLongPress={() => handleDeletePreset(preset.id, name)}
                    >
                      <Text style={styles.presetIcon}>{preset.icon}</Text>
                      <Text style={styles.presetName}>{name}</Text>
                      <Text style={styles.presetMode}>
                        {preset.id.includes('boxing') ? '🥊' : '⏱️'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* About */}
            <Text style={styles.sectionLabel}>{t('settingsScreen.about')}</Text>
            <View style={styles.card}>
              <Text style={styles.aboutText}>Fight Timer v1.0</Text>
              <Text style={styles.aboutSub}>{t('settingsScreen.contactDev')}</Text>
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
  title: {
    fontFamily: FontFamily.heading,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  sectionLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
  },
  row: {
    marginBottom: Spacing.sm,
  },
  label: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  pillRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    borderColor: Colors.neonCyan,
    backgroundColor: Colors.neonCyan + '18',
  },
  pillText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  pillTextActive: {
    color: Colors.neonCyan,
  },
  langPill: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  langPillActive: {
    borderColor: Colors.neonCyan,
    backgroundColor: Colors.neonCyan + '18',
  },
  langText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  langTextActive: {
    color: Colors.neonCyan,
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.surfaceBorder,
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
  presetMode: {
    fontSize: 14,
  },
  emptyText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  aboutText: {
    fontFamily: FontFamily.bodySemiBold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  aboutSub: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});
