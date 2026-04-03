import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Orbitron_400Regular,
  Orbitron_700Bold,
} from '@expo-google-fonts/orbitron';
import {
  Exo2_400Regular,
  Exo2_600SemiBold,
  Exo2_700Bold,
} from '@expo-google-fonts/exo-2';
import { Colors } from '@/constants/theme';
import i18n from '@/lib/i18n';
import { useSettingsStore } from '@/store/settings-store';
import { useHistoryStore } from '@/store/history-store';
import { useAchievementStore } from '@/store/achievement-store';
import 'react-native-reanimated';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Orbitron_400Regular,
    Orbitron_700Bold,
    Exo2_400Regular,
    Exo2_600SemiBold,
    Exo2_700Bold,
  });

  const loadSettings = useSettingsStore((s) => s.load);
  const language = useSettingsStore((s) => s.language);
  const settingsLoaded = useSettingsStore((s) => s.loaded);
  const loadHistory = useHistoryStore((s) => s.load);
  const historyLoaded = useHistoryStore((s) => s.loaded);
  const loadAchievements = useAchievementStore((s) => s.load);
  const achievementsLoaded = useAchievementStore((s) => s.loaded);

  const isReady =
    fontsLoaded && settingsLoaded && historyLoaded && achievementsLoaded;

  i18n.locale = language;

  useEffect(() => {
    loadSettings();
    loadHistory();
    loadAchievements();
  }, [loadSettings, loadHistory, loadAchievements]);

  const onLayoutRootView = useCallback(async () => {
    if (isReady) {
      await SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) return null;

  return (
    <View
      key={language}
      style={{ flex: 1, backgroundColor: Colors.background }}
      onLayout={onLayoutRootView}
    >
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="boxing/config" />
        <Stack.Screen name="tabata/config" />
        <Stack.Screen
          name="timer"
          options={{
            animation: 'fade',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="result"
          options={{
            animation: 'slide_from_bottom',
            gestureEnabled: false,
          }}
        />
      </Stack>
      <StatusBar style="light" />
    </View>
  );
}
