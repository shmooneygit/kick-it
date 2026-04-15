import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SoundScheme } from '@/lib/types';
import { t } from '@/lib/i18n';
import { useSettingsStore } from '@/store/settings-store';
import {
  Colors,
  FontFamily,
} from '@/constants/theme';

interface SoundPickerProps {
  visible: boolean;
  currentScheme: SoundScheme;
  onSelect: (scheme: SoundScheme) => void;
  onClose: () => void;
}

const SOUND_OPTIONS: { key: SoundScheme; icon: string; labelKey: string }[] = [
  { key: 'bell', icon: '🔔', labelKey: 'sound_bell' },
  { key: 'beep', icon: '📢', labelKey: 'sound_beep' },
  { key: 'whistle', icon: '📣', labelKey: 'sound_whistle' },
];

export function SoundPicker({
  visible,
  currentScheme,
  onSelect,
  onClose,
}: SoundPickerProps) {
  useSettingsStore((s) => s.language);

  const handleSelect = (scheme: SoundScheme) => {
    onSelect(scheme);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('sound_scheme')}</Text>
          {SOUND_OPTIONS.map((option, index) => {
            const selected = option.key === currentScheme;
            return (
              <Pressable
                key={option.key}
                style={[
                  styles.option,
                  selected ? styles.optionSelected : styles.optionIdle,
                  index === SOUND_OPTIONS.length - 1 && styles.optionLast,
                ]}
                onPress={() => handleSelect(option.key)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selected ? styles.optionTextSelected : styles.optionTextIdle,
                  ]}
                >
                  {option.icon} {t(option.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: 16,
  },
  title: {
    fontFamily: FontFamily.body,
    fontSize: 10,
    color: Colors.textPrimary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  option: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  optionIdle: {
    borderColor: Colors.border,
  },
  optionSelected: {
    borderColor: Colors.green,
    backgroundColor: 'rgba(57,255,20,0.08)',
  },
  optionLast: {
    marginBottom: 0,
  },
  optionText: {
    fontFamily: FontFamily.body,
    fontSize: 13,
  },
  optionTextIdle: {
    color: Colors.textSecondary,
  },
  optionTextSelected: {
    color: Colors.green,
  },
});
