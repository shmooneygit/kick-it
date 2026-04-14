import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import Constants from 'expo-constants';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Orbitron_400Regular,
  Orbitron_700Bold,
} from '@expo-google-fonts/orbitron';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import {
  Exo2_400Regular,
  Exo2_600SemiBold,
  Exo2_700Bold,
} from '@expo-google-fonts/exo-2';
import { Colors } from '@/constants/theme';
import { ErrorBoundary } from '@/components/error-boundary';
import i18n from '@/lib/i18n';
import { configureAudioModeOnce } from '@/hooks/use-sound';
import { useSettingsStore } from '@/store/settings-store';
import { useHistoryStore } from '@/store/history-store';
import { useAchievementStore } from '@/store/achievement-store';
import { useWorkoutStore } from '@/store/workout-store';
import 'react-native-reanimated';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [audioReady, setAudioReady] = useState(false);
  const [fontsLoaded] = useFonts({
    BebasNeue: BebasNeue_400Regular,
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
    fontsLoaded && settingsLoaded && historyLoaded && achievementsLoaded && audioReady;

  i18n.locale = language;

  useEffect(() => {
    if (__DEV__ && Constants.appOwnership === 'expo') {
      console.warn(
        'Background timer audio will not work in Expo Go. Use a development build or production build for background-audio testing.',
      );
    }

    configureAudioModeOnce()
      .catch((error) => {
        console.warn('Audio mode initialization failed:', error);
      })
      .finally(() => {
        setAudioReady(true);
      });

    loadSettings();
    loadHistory();
    loadAchievements();
    void useWorkoutStore.getState().loadLastConfigs();
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
      <ErrorBoundary>
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
      </ErrorBoundary>
      <StatusBar style="light" />
    </View>
  );
}
