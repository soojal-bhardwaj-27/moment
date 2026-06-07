import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View, Alert } from 'react-native';
import { theme } from '../../theme';
import * as Updates from 'expo-updates';

import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Inter_500Medium,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

SplashScreen.preventAutoHideAsync();

import { AppProvider } from '../context/AppContext';

export default function RootLayout() {
  const [loaded, error] = useFonts({
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    Inter_500Medium,
    Inter_700Bold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  useEffect(() => {
    async function checkUpdates() {
      if (__DEV__) return;
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          const fetched = await Updates.fetchUpdateAsync();
          if (fetched.isNew) {
            Alert.alert(
              "New Update Available",
              "A new update for Moment is ready. Reload the app now to apply the latest changes.",
              [
                { text: "Reload Now", onPress: () => Updates.reloadAsync() },
                { text: "Later", style: "cancel" }
              ]
            );
          }
        }
      } catch (e) {
        console.log('OTA Updates check failed:', e);
      }
    }
    checkUpdates();
  }, []);

  if (!loaded && !error) {
    return null;
  }

  return (
    <AppProvider>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
        </Stack>
      </View>
    </AppProvider>
  );
}
