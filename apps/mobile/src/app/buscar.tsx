import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Card, ErrorBanner, Icon, SectionTitle, Txt, useDayLabel, type IconName } from '@/components/ui';
import { useI18n } from '@/i18n';
import { backend } from '@/lib/backend';
import { radius, space, useTheme } from '@/lib/theme';
import type { SearchResult } from '@/lib/types';

const TYPE_ICON: Record<string, IconName> = { task: 'calendar-check-outline', expense: 'receipt-text-outline', saved: 'bookmark-outline' };
const TYPE_ROUTE = { task: '/agenda', expense: '/gastos', saved: '/guardados' } as const;

export default function Buscar() {
  const theme = useTheme();
  const { t } = useI18n();
  const dayLabel = useDayLabel();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    if (!q.trim()) return;
    setBusy(true);
    setError(null);
    try {
      setResult(await backend.search(q.trim()));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }} keyboardShouldPersistTaps="handled">
      <View style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Icon name="magnify" color={theme.textMuted} />
        <TextInput
          autoFocus
          value={q}
          onChangeText={setQ}
          onSubmitEditing={search}
          returnKeyType="search"
          placeholder={t.search.placeholder}
          placeholderTextColor={theme.textMuted}
          style={{ flex: 1, color: theme.text, fontSize: 16, paddingVertical: 12 }}
        />
      </View>

      {error ? <ErrorBanner message={error} onRetry={search} /> : null}
      {busy ? (
        <View style={{ alignItems: 'center', gap: space.sm, padding: space.xl }}>
          <ActivityIndicator color={theme.primary} />
          <Txt muted>{t.search.searching}</Txt>
        </View>
      ) : null}

      {result && !busy ? (
        <>
          <Card style={{ backgroundColor: theme.primarySoft, borderColor: theme.primarySoft, flexDirection: 'row', gap: space.md }}>
            <Icon name="creation-outline" color={theme.primaryDark} />
            <Txt style={{ flex: 1 }} color={theme.text}>
              {result.answer}
            </Txt>
          </Card>
          {result.results.length ? (
            <>
              <SectionTitle>{t.search.found}</SectionTitle>
              <Card style={{ paddingVertical: space.xs }}>
                {result.results.map((r) => (
                  <Pressable key={`${r.type}${r.id}`} style={styles.row} onPress={() => router.navigate(TYPE_ROUTE[r.type])}>
                    <Icon name={TYPE_ICON[r.type] ?? 'circle-outline'} color={theme.primary} />
                    <View style={{ flex: 1 }}>
                      <Txt style={{ fontWeight: '600' }}>{r.title}</Txt>
                      <Txt variant="small" muted numberOfLines={2}>
                        {[t.search.types[r.type], r.detail, dayLabel(r.date)].filter(Boolean).join(' · ')}
                      </Txt>
                    </View>
                  </Pressable>
                ))}
              </Card>
            </>
          ) : (
            <Txt muted style={{ textAlign: 'center' }}>
              {t.search.none}
            </Txt>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
});
