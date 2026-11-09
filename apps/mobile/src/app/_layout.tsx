import { Redirect, Stack, useSegments } from 'expo-router';
import { ShareIntentProvider } from 'expo-share-intent';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ResultSheet } from '@/components/capture';
import { ShareIntentHandler } from '@/components/share-intent';
import { useI18n } from '@/i18n';
import { useTheme } from '@/lib/theme';
import { useData } from '@/state/data';
import { useSession, useSessionListener, useSignedIn } from '@/state/session';

function Root() {
  const theme = useTheme();
  const { t } = useI18n();
  const ready = useSession((s) => s.ready);
  const signedIn = useSignedIn();
  const segments = useSegments();
  const refresh = useData((s) => s.refresh);
  useSessionListener();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.background);
  }, [theme.background]);

  useEffect(() => {
    if (signedIn) void refresh();
  }, [signedIn, refresh]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  const onLogin = segments[0] === 'login';
  if (!signedIn && !onLogin) return <Redirect href="/login" />;
  if (signedIn && onLogin) return <Redirect href="/" />;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="buscar" options={{ title: t.search.title, presentation: 'modal' }} />
        <Stack.Screen name="escribir" options={{ title: t.write.title, presentation: 'modal' }} />
        <Stack.Screen name="ajustes" options={{ title: t.settings.title }} />
      </Stack>
      <ResultSheet />
      <ShareIntentHandler />
    </View>
  );
}

export default function RootLayout() {
  return (
    <ShareIntentProvider>
      <SafeAreaProvider>
        <Root />
      </SafeAreaProvider>
    </ShareIntentProvider>
  );
}
