import 'react-native-get-random-values';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Sora_400Regular, Sora_600SemiBold } from '@expo-google-fonts/sora';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
import { openDatabase, runMigrations } from '../db/migrations';
import { seedDatabase } from '../db/seed';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useCategoryStore } from '../stores/categoryStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useAuthStore } from '../stores/authStore';
import { ThemeContext, useThemeColors } from '../constants/theme';
import LockScreen from '../components/LockScreen';
import { setupNotificationHandler } from '../services/notificationService';

SplashScreen.preventAutoHideAsync();
setupNotificationHandler();

export default function RootLayout() {
  const { loadCategories } = useCategoryStore();
  const { theme, loadSettings: _ls } = useSettingsStore();
  const colors = useThemeColors(theme);
  const router = useRouter();
  const { isLocked, isAuthReady, initAuth, lock } = useAuthStore();
  const onboardingChecked = useRef(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const [fontsLoaded] = useFonts({
    'Sora-Regular': Sora_400Regular,
    'Sora-SemiBold': Sora_600SemiBold,
    'SpaceMono-Regular': SpaceMono_400Regular,
  });

  useEffect(() => {
    try {
      const db = openDatabase();
      runMigrations(db);
      seedDatabase(db);
      loadCategories(db);
      if (!onboardingChecked.current) {
        onboardingChecked.current = true;
        const row = db.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['onboarding_done']);
        if (!row) {
          setTimeout(() => router.replace('/onboarding'), 100);
        }
      }
    } catch (e) {
      console.error('DB init error:', e);
    }
    initAuth();
  }, []);

  // Lock on background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current === 'active' && next === 'background') {
        lock();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [lock]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded || !isAuthReady) return null;

  if (isLocked) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeContext.Provider value={colors}>
          <StatusBar style={theme === 'light' ? 'dark' : 'light'} backgroundColor={colors.bg} />
          <LockScreen />
        </ThemeContext.Provider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ThemeContext.Provider value={colors}>
    <ErrorBoundary>
      <StatusBar style={theme === 'light' ? 'dark' : 'light'} backgroundColor={colors.bg} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: 'Sora-SemiBold', fontSize: 18 },
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="add"
          options={{
            presentation: 'modal',
            title: 'Nouvelle opération',
            headerStyle: { backgroundColor: colors.surface },
          }}
        />
        <Stack.Screen
          name="categories"
          options={{
            title: 'Catégories',
            headerStyle: { backgroundColor: colors.surface },
          }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false }}
        />
      </Stack>
    </ErrorBoundary>
    </ThemeContext.Provider>
    </GestureHandlerRootView>
  );
}
