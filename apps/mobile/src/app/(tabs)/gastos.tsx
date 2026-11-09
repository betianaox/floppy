import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card, EmptyState, Icon, IconButton, ScreenHeader, SectionTitle, SOURCE_ICONS, Txt, useDayLabel } from '@/components/ui';
import { fill, useI18n } from '@/i18n';
import { parseIso, shiftMonth } from '@/lib/dates';
import { CATEGORY_COLORS, radius, space, useTheme } from '@/lib/theme';
import type { Expense } from '@/lib/types';
import { useData } from '@/state/data';

export default function Gastos() {
  const theme = useTheme();
  const { t, locale, money } = useI18n();
  const dayLabel = useDayLabel();
  const { expenses, month, setMonth, removeExpense } = useData();

  const total = expenses.reduce((s, x) => s + Number(x.amount), 0);
  const byCat = Object.entries(
    expenses.reduce<Record<string, number>>((acc, x) => ({ ...acc, [x.category]: (acc[x.category] ?? 0) + Number(x.amount) }), {}),
  ).sort((a, b) => b[1] - a[1]);
  const max = byCat[0]?.[1] ?? 1;
  const byDay = expenses.reduce<Record<string, Expense[]>>((acc, x) => ({ ...acc, [x.spent_on]: [...(acc[x.spent_on] ?? []), x] }), {});
  const title = parseIso(month).toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  const askDelete = (x: Expense) =>
    Alert.alert(fill(t.common.deleteQuestion, { title: x.merchant ?? t.categories[x.category] ?? '' }), undefined, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.delete, style: 'destructive', onPress: () => removeExpense(x.id) },
    ]);

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title={t.tabs.expenses} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl }}>
        <Card style={{ gap: space.xs }}>
          <View style={styles.monthBar}>
            <IconButton icon="chevron-left" label="‹" onPress={() => setMonth(shiftMonth(month, -1))} />
            <Txt variant="heading">
              {title.charAt(0).toUpperCase() + title.slice(1)}
            </Txt>
            <IconButton icon="chevron-right" label="›" onPress={() => setMonth(shiftMonth(month, 1))} />
          </View>
          <Txt variant="small" muted style={{ textAlign: 'center' }}>
            {t.expenses.total}
          </Txt>
          <Txt variant="number" style={{ textAlign: 'center' }}>
            {money(total)}
          </Txt>
          <Txt variant="small" muted style={{ textAlign: 'center' }}>
            {fill(t.expenses.count, { n: expenses.length })}
          </Txt>
        </Card>

        {expenses.length === 0 ? (
          <EmptyState icon="receipt-text-outline" title={t.expenses.empty} />
        ) : (
          <>
            <SectionTitle>{t.expenses.byCategory}</SectionTitle>
            <Card style={{ gap: space.md }}>
              {byCat.map(([cat, sum]) => (
                <View key={cat} style={{ gap: 6 }}>
                  <View style={styles.catRow}>
                    <View style={[styles.dot, { backgroundColor: CATEGORY_COLORS[cat] }]} />
                    <Txt style={{ flex: 1, fontWeight: '600' }}>{t.categories[cat] ?? cat}</Txt>
                    <Txt variant="small" muted>
                      {Math.round((sum / total) * 100)} %
                    </Txt>
                    <Txt style={{ fontWeight: '700', minWidth: 96, textAlign: 'right' }}>{money(sum)}</Txt>
                  </View>
                  <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
                    <View style={[styles.bar, { width: `${(sum / max) * 100}%`, backgroundColor: CATEGORY_COLORS[cat] }]} />
                  </View>
                </View>
              ))}
            </Card>

            <SectionTitle>{t.expenses.movements}</SectionTitle>
            <Card style={{ paddingVertical: space.xs }}>
              {Object.entries(byDay).map(([day, list]) => (
                <View key={day}>
                  <Txt variant="label" muted style={{ marginTop: space.md, textTransform: 'capitalize' }}>
                    {dayLabel(day)}
                  </Txt>
                  {list.map((x) => (
                    <Pressable key={x.id} onLongPress={() => askDelete(x)} style={styles.row}>
                      <View style={[styles.catIcon, { backgroundColor: theme.surfaceAlt }]}>
                        <View style={[styles.dot, { backgroundColor: CATEGORY_COLORS[x.category] }]} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Txt style={{ fontWeight: '600' }}>{x.merchant ?? t.categories[x.category]}</Txt>
                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                          <Icon name={SOURCE_ICONS[x.source] ?? 'pencil-outline'} size={13} color={theme.textMuted} />
                          <Txt variant="small" muted numberOfLines={1} style={{ flex: 1 }}>
                            {[t.categories[x.category], x.items?.map((i) => i.name).join(', ')].filter(Boolean).join(' · ')}
                          </Txt>
                        </View>
                      </View>
                      <Txt style={{ fontWeight: '700' }}>{money(Number(x.amount), x.currency)}</Txt>
                    </Pressable>
                  ))}
                </View>
              ))}
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  track: { height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  bar: { height: 8, borderRadius: radius.pill },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  catIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
