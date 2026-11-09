import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/ui';
import { useI18n } from '@/i18n';
import { radius, space, useTheme } from '@/lib/theme';
import { useData } from '@/state/data';

/** Escribir una nota libre o guardar un enlace. */
export default function Escribir() {
  const theme = useTheme();
  const { t } = useI18n();
  const { modo, url: shared, texto } = useLocalSearchParams<{ modo?: string; url?: string; texto?: string }>();
  const isLink = modo === 'enlace';
  const capture = useData((s) => s.capture);
  const capturing = useData((s) => s.capturing);
  const [text, setText] = useState(texto ?? '');
  const [url, setUrl] = useState(shared ?? '');

  const input = [styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }];
  const valid = isLink ? /^https?:\/\/\S+\.\S+/.test(url.trim()) : text.trim().length > 2;

  async function save() {
    const ok = await capture(isLink ? { kind: 'link', url: url.trim(), text: text.trim() || undefined } : { kind: 'text', text: text.trim() });
    if (ok) router.back();
  }

  return (
    <View style={{ padding: space.lg, gap: space.md }}>
      <Stack.Screen options={{ title: isLink ? t.write.linkTitle : t.write.title }} />
      {isLink ? (
        <TextInput
          style={input}
          value={url}
          onChangeText={setUrl}
          autoFocus
          autoCapitalize="none"
          keyboardType="url"
          placeholder={t.write.linkPlaceholder}
          placeholderTextColor={theme.textMuted}
        />
      ) : null}
      <TextInput
        style={[input, { minHeight: isLink ? 70 : 150, textAlignVertical: 'top' }]}
        value={text}
        onChangeText={setText}
        autoFocus={!isLink}
        multiline
        placeholder={isLink ? t.write.linkNote : t.write.placeholder}
        placeholderTextColor={theme.textMuted}
      />
      <Button label={t.write.save} icon="content-save-outline" loading={capturing} disabled={!valid} onPress={save} />
    </View>
  );
}

const styles = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.lg, paddingVertical: 14, fontSize: 16 },
});
