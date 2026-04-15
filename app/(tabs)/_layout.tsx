import { Tabs } from 'expo-router';
import { Colors, FontFamily } from '@/constants/theme';
import { t } from '@/lib/i18n';
import { useSettingsStore } from '@/store/settings-store';

export default function TabLayout() {
  useSettingsStore((s) => s.language);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        transitionSpec: {
          animation: 'timing',
          config: {
            duration: 120,
          },
        },
        sceneStyle: {
          backgroundColor: Colors.background,
        },
        tabBarStyle: {
          backgroundColor: Colors.tabBar,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 56,
          paddingTop: 4,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: Colors.green,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarItemStyle: {
          justifyContent: 'center',
        },
        tabBarLabelStyle: {
          fontFamily: FontFamily.body,
          fontSize: 9,
          marginTop: 0,
          letterSpacing: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.timer').toUpperCase(),
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: t('tabs.stats').toUpperCase(),
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen
        name="achievements"
        options={{
          title: t('tabs.achievements').toUpperCase(),
          tabBarIcon: () => null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings').toUpperCase(),
          tabBarIcon: () => null,
        }}
      />
    </Tabs>
  );
}
