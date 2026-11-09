import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { SavedCard } from '@/components/saved-card';
import { Chip, EmptyState, ScreenHeader } from '@/components/ui';
import { useI18n } from '@/i18n';
import { space } from '@/lib/theme';
import type { SavedKind } from '@/lib/types';
import { useData } from '@/state/data';

export default function Guardados() {
  const { t } = useI18n();
  const saved = useData((s) => s.saved);
  const [kind, setKind] = useState<SavedKind | 'all'>('all');
  const [tag, setTag] = useState<string | null>(null);

  const tags = useMemo(() => {
    const count = new Map<string, number>();
    saved.forEach((s) => s.tags.forEach((x) => count.set(x, (count.get(x) ?? 0) + 1)));
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([x]) => x).slice(0, 12);
  }, [saved]);

  const list = saved.filter((s) => (kind === 'all' || s.kind === kind) && (!tag || s.tags.includes(tag)));
  const kinds: (SavedKind | 'all')[] = ['all', 'note', 'link', 'photo'];

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title={t.tabs.saved} />
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {kinds.map((k) => (
            <Chip key={k} label={t.saved[k]} active={kind === k} onPress={() => setKind(k)} />
          ))}
        </ScrollView>
        {tags.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, { paddingTop: 0 }]}>
            {tags.map((x) => (
              <Chip key={x} label={`#${x}`} active={tag === x} onPress={() => setTag(tag === x ? null : x)} />
            ))}
          </ScrollView>
        ) : null}
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.md }}>
        {list.length === 0 ? (
          <EmptyState icon="bookmark-outline" title={t.saved.empty} hint={t.saved.emptyHint} />
        ) : (
          list.map((s) => <SavedCard key={s.id} item={s} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
});
