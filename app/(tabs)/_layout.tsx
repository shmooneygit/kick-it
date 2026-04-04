import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { Colors, FontFamily } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { useSettingsStore } from '@/store/settings-store';

export default function TabLayout() {
  useSettingsStore((s) => s.language);

  const renderEmoji = (emoji: string) => (
    <Text style={{ fontSize: 18, lineHeight: 20 }}>{emoji}</Text>
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.tabBar,
          borderTopColor: 'rgba(0,245,255,0.1)',
          borderTopWidth: 1,
          height: 62,
          paddingTop: 4,
          paddingBottom: 6,
        },
        tabBarActiveTintColor: Colors.cyan,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontFamily: FontFamily.body,
          fontSize: 10,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.timer'),
          tabBarIcon: () => renderEmoji('🥊'),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: t('tabs.stats'),
          tabBarIcon: () => renderEmoji('📊'),
        }}
      />
      <Tabs.Screen
        name="achievements"
        options={{
          title: t('tabs.achievements'),
          tabBarIcon: () => renderEmoji('🏆'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: () => renderEmoji('⚙️'),
        }}
      />
    </Tabs>
  );
}
