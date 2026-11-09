import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, View } from 'react-native';

import { fill, useI18n } from '@/i18n';
import { backend } from '@/lib/backend';
import { radius, space, useTheme } from '@/lib/theme';
import type { Saved } from '@/lib/types';
import { useData } from '@/state/data';

import { Card, Icon, Txt, type IconName } from './ui';

const KIND_ICON: Record<Saved['kind'], IconName> = { note: 'note-text-outline', link: 'link-variant', photo: 'image-outline' };

function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** Una nota, un enlace o una foto guardada, con su resumen y etiquetas. */
export function SavedCard({ item }: { item: Saved }) {
  const theme = useTheme();
  const { t } = useI18n();
  const remove = useData((s) => s.removeSaved);
  const [photo, setPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (item.photo_path) void backend.photoUrl(item.photo_path).then(setPhoto);
  }, [item.photo_path]);

  const askDelete = () =>
    Alert.alert(fill(t.common.deleteQuestion, { title: item.title }), undefined, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.delete, style: 'destructive', onPress: () => remove(item.id) },
    ]);

  return (
    <Card onPress={item.url ? () => WebBrowser.openBrowserAsync(item.url!) : undefined} style={{ gap: space.sm, padding: 0, overflow: 'hidden' }}>
      {photo ? <Image source={{ uri: photo }} style={{ height: 150 }} resizeMode="cover" /> : null}
      <View style={{ padding: space.lg, gap: space.sm }}>
        <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
          <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
            <Icon name={KIND_ICON[item.kind]} size={18} color={theme.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt style={{ fontWeight: '700' }}>{item.title}</Txt>
            {item.url ? (
              <Txt variant="small" color={theme.primary} numberOfLines={1}>
                {host(item.url)}
              </Txt>
            ) : null}
          </View>
        </View>
        {item.summary ? (
          <Txt variant="small" muted numberOfLines={3}>
            {item.summary}
          </Txt>
        ) : null}
        <View style={styles.tags}>
          {item.tags.map((tag) => (
            <View key={tag} style={[styles.tag, { backgroundColor: theme.surfaceAlt }]}>
              <Txt variant="small" muted>
                #{tag}
              </Txt>
            </View>
          ))}
          <View style={{ flex: 1 }} />
          <Txt variant="small" color={theme.danger} onPress={askDelete}>
            {t.common.delete}
          </Txt>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  icon: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, alignItems: 'center' },
  tag: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
});
