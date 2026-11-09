import { router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { CaptureBar } from '@/components/capture';
import { SavedCard } from '@/components/saved-card';
import { Card, ErrorBanner, Icon, ScreenHeader, SectionTitle, Txt, useDayLabel } from '@/components/ui';
import { useI18n } from '@/i18n';
import { isoDate } from '@/lib/dates';
import { radius, space, useTheme } from '@/lib/theme';
import { useData } from '@/state/data';

export default function Home() {
  const theme = useTheme();
  const { t, money } = useI18n();
  const dayLabel = useDayLabel();
  const { tasks, expenses, saved, loading, error, refresh, toggleTask } = useData();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t.home.morning : hour < 20 ? t.home.afternoon : t.home.evening;
  const today = isoDate();
  const forToday = tasks.filter((x) => !x.done && x.due_date && x.due_date <= today);
  const spent = expenses.reduce((s, x) => s + Number(x.amount), 0);

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={theme.primary} />}
      >
        <Txt variant="title" style={{ marginBottom: space.md }}>
          {greeting}
        </Txt>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/buscar')}
          style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Icon name="magnify" color={theme.textMuted} />
          <Txt muted>{t.home.search}</Txt>
        </Pressable>

        {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}

        <CaptureBar />

        <View style={styles.tiles}>
          <Card style={styles.tile} onPress={() => router.push('/gastos')}>
            <Icon name="table-large" color={theme.primary} />
            <Txt variant="small" muted>
              {t.home.spentThisMonth}
            </Txt>
            <Txt variant="heading">{money(spent)}</Txt>
          </Card>
          <Card style={styles.tile} onPress={() => router.push('/guardados')}>
            <Icon name="bookmark-multiple-outline" color={theme.primary} />
            <Txt variant="small" muted>
              {t.home.savedItems}
            </Txt>
            <Txt variant="heading">{saved.length}</Txt>
          </Card>
        </View>

        <SectionTitle
          right={
            <Txt variant="small" color={theme.primary} style={{ fontWeight: '700' }} onPress={() => router.push('/agenda')}>
              {t.home.seeAll}
            </Txt>
          }
        >
          {t.home.forToday}
        </SectionTitle>
        <Card style={{ paddingVertical: space.sm }}>
          {forToday.length === 0 ? (
            <Txt muted style={{ paddingVertical: space.sm }}>
              {t.home.nothingToday}
            </Txt>
          ) : (
            forToday.slice(0, 4).map((task) => (
              <Pressable key={task.id} onPress={() => toggleTask(task)} style={styles.taskRow} accessibilityRole="checkbox" accessibilityState={{ checked: task.done }}>
                <Icon name="checkbox-blank-circle-outline" color={theme.primary} />
                <Txt style={{ flex: 1 }}>{task.title}</Txt>
                {task.due_date && task.due_date < today ? (
                  <Txt variant="small" color={theme.danger}>
                    {dayLabel(task.due_date)}
                  </Txt>
                ) : null}
              </Pressable>
            ))
          )}
        </Card>

        <SectionTitle>{t.home.recent}</SectionTitle>
        <View style={{ gap: space.md }}>
          {saved.slice(0, 2).map((s) => (
            <SavedCard key={s.id} item={s} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space.lg, paddingVertical: 12, marginBottom: space.lg },
  tiles: { flexDirection: 'row', gap: space.md, marginTop: space.lg },
  tile: { flex: 1, gap: 4 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
});
