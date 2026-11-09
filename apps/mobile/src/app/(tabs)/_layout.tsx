import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/ui';
import { useI18n } from '@/i18n';
import { useTheme } from '@/lib/theme';

export default function TabsLayout() {
  const theme = useTheme();
  const { t } = useI18n();
  const icon = (name: IconName) => ({ color }: { color: ColorValue }) => <Icon name={name} color={String(color)} size={24} />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.background },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        tabBarLabelStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.tabs.home, tabBarIcon: icon('home-variant-outline') }} />
      <Tabs.Screen name="agenda" options={{ title: t.tabs.agenda, tabBarIcon: icon('calendar-month-outline') }} />
      <Tabs.Screen name="gastos" options={{ title: t.tabs.expenses, tabBarIcon: icon('table-large') }} />
      <Tabs.Screen name="guardados" options={{ title: t.tabs.saved, tabBarIcon: icon('bookmark-multiple-outline') }} />
    </Tabs>
  );
}
