import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Sora_400Regular, Sora_600SemiBold } from '@expo-google-fonts/sora';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
import { openDatabase, runMigrations } from '../db/migrations';
import { seedDatabase } from '../db/seed';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ErrorBoundary } from '../components/ErrorBoundary';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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
    } catch (e) {
      console.error('DB init error:', e);
    }
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ErrorBoundary>
      <StatusBar style="light" backgroundColor="#0F0F14" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0F0F14' },
          headerTintColor: '#F0EFF8',
          headerTitleStyle: { fontFamily: 'Sora-SemiBold', fontSize: 18 },
          contentStyle: { backgroundColor: '#0F0F14' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="add"
          options={{
            presentation: 'modal',
            title: 'Nouvelle opération',
            headerStyle: { backgroundColor: '#1A1A24' },
          }}
        />
      </Stack>
    </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
