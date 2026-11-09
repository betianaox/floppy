import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { Alert, ScrollView, View } from 'react-native';

import { Button, Card, Chip, SectionTitle, Txt } from '@/components/ui';
import { fill, LANGUAGES, useI18n } from '@/i18n';
import { backend } from '@/lib/backend';
import { space } from '@/lib/theme';
import { useSession } from '@/state/session';
import { useSettings, type ThemeChoice } from '@/state/settings';

export default function Ajustes() {
  const { t } = useI18n();
  const { language, theme, setLanguage, setTheme } = useSettings();
  const session = useSession((s) => s.session);
  const signOut = useSession((s) => s.signOut);

  const confirmDelete = () =>
    Alert.alert(t.settings.deleteAccount, t.settings.deleteConfirm, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: async () => {
          try {
            await backend.deleteAccount();
            await signOut();
          } catch (e) {
            Alert.alert(t.common.error, e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);

  const themes: ThemeChoice[] = ['system', 'light', 'dark'];

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}>
      <SectionTitle>{t.settings.language}</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        <Chip label={t.settings.system} active={language === 'system'} onPress={() => setLanguage('system')} />
        {LANGUAGES.map((l) => (
          <Chip key={l.id} label={l.label} active={language === l.id} onPress={() => setLanguage(l.id)} />
        ))}
      </View>

      <SectionTitle>{t.settings.theme}</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {themes.map((x) => (
          <Chip key={x} label={t.settings[x]} active={theme === x} onPress={() => setTheme(x)} />
        ))}
      </View>

      <SectionTitle>{t.settings.account}</SectionTitle>
      <Card style={{ gap: space.md }}>
        {session?.user.email ? <Txt muted>{session.user.email}</Txt> : null}
        <Button kind="secondary" icon="logout" label={t.settings.signOut} onPress={signOut} />
        <Button kind="danger" icon="account-remove-outline" label={t.settings.deleteAccount} onPress={confirmDelete} />
      </Card>

      <View style={{ alignItems: 'center', gap: space.sm, marginTop: space.xl }}>
        <Button kind="ghost" label={t.settings.privacy} onPress={() => WebBrowser.openBrowserAsync('https://imagostack.com/es/apps/floppy/privacidad')} />
        <Txt variant="small" muted>
          {fill(t.settings.version, { v: Constants.expoConfig?.version ?? '1.0.0' })}
        </Txt>
      </View>
    </ScrollView>
  );
}
