import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card, EmptyState, Icon, IconButton, ScreenHeader, SectionTitle, SOURCE_ICONS, Txt, useDayLabel } from '@/components/ui';
import { fill, useI18n } from '@/i18n';
import { isoDate, monthKey, parseIso, shiftMonth } from '@/lib/dates';
import { radius, space, useTheme } from '@/lib/theme';
import type { Task } from '@/lib/types';
import { useData } from '@/state/data';

function TaskRow({ task }: { task: Task }) {
  const theme = useTheme();
  const { t } = useI18n();
  const dayLabel = useDayLabel();
  const { toggleTask, removeTask } = useData();
  const overdue = !task.done && !!task.due_date && task.due_date < isoDate();
  return (
    <View style={styles.row}>
      <Pressable onPress={() => toggleTask(task)} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked: task.done }}>
        <Icon name={task.done ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} color={theme.primary} size={26} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Txt style={[{ fontWeight: '600' }, task.done && { textDecorationLine: 'line-through', color: theme.textMuted }]}>{task.title}</Txt>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <Icon name={SOURCE_ICONS[task.source] ?? 'pencil-outline'} size={13} color={theme.textMuted} />
          {task.due_date && overdue ? (
            <Txt variant="small" color={theme.danger}>
              {dayLabel(task.due_date)}
            </Txt>
          ) : null}
          {task.notes ? (
            <Txt variant="small" muted numberOfLines={1} style={{ flex: 1 }}>
              {task.notes}
            </Txt>
          ) : null}
        </View>
      </View>
      <IconButton
        icon="trash-can-outline"
        label={t.common.delete}
        color={theme.textMuted}
        onPress={() =>
          Alert.alert(fill(t.common.deleteQuestion, { title: task.title }), undefined, [
            { text: t.common.cancel, style: 'cancel' },
            { text: t.common.delete, style: 'destructive', onPress: () => removeTask(task.id) },
          ])
        }
      />
    </View>
  );
}

/** Calendario del mes con un punto en los días que tienen tareas pendientes. */
function MonthCalendar({ month, selected, onSelect, marked }: { month: string; selected: string; onSelect: (d: string) => void; marked: Set<string> }) {
  const theme = useTheme();
  const { locale } = useI18n();
  const first = parseIso(month);
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // la semana empieza el lunes
  const today = isoDate();
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 1 + i).toLocaleDateString(locale, { weekday: 'narrow' }),
  );
  const cells = [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  return (
    <View>
      <View style={styles.week}>
        {weekdays.map((w, i) => (
          <Txt key={i} variant="small" muted style={styles.cellText}>
            {w}
          </Txt>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((n, i) => {
          if (n === null) return <View key={`x${i}`} style={styles.cell} />;
          const iso = isoDate(new Date(first.getFullYear(), first.getMonth(), n));
          const isSel = iso === selected;
          const isToday = iso === today;
          return (
            <Pressable key={iso} onPress={() => onSelect(iso)} style={styles.cell} accessibilityRole="button" accessibilityState={{ selected: isSel }}>
              <View style={[styles.day, isSel && { backgroundColor: theme.primary }, !isSel && isToday && { borderColor: theme.primary, borderWidth: 1.5 }]}>
                <Txt style={{ fontWeight: isSel || isToday ? '800' : '500', color: isSel ? theme.onPrimary : theme.text }}>{n}</Txt>
              </View>
              <View style={[styles.mark, { backgroundColor: marked.has(iso) ? (isSel ? theme.primary : theme.primary) : 'transparent' }]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function Agenda() {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const tasks = useData((s) => s.tasks);
  const [month, setMonth] = useState(monthKey());
  const [selected, setSelected] = useState(isoDate());
  const today = isoDate();

  const marked = useMemo(() => new Set(tasks.filter((x) => !x.done && x.due_date).map((x) => x.due_date!)), [tasks]);
  const ofDay = tasks.filter((x) => x.due_date === selected);
  const overdue = tasks.filter((x) => !x.done && x.due_date && x.due_date < today);
  const noDate = tasks.filter((x) => !x.due_date && !x.done);
  const title = parseIso(month).toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  return (
    <View style={{ flex: 1 }}>
      <ScreenHeader title={t.tabs.agenda} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xxl }}>
        <Card>
          <View style={styles.monthBar}>
            <IconButton icon="chevron-left" label="‹" onPress={() => setMonth(shiftMonth(month, -1))} />
            <Txt variant="heading">
              {title.charAt(0).toUpperCase() + title.slice(1)}
            </Txt>
            <IconButton icon="chevron-right" label="›" onPress={() => setMonth(shiftMonth(month, 1))} />
          </View>
          <MonthCalendar month={month} selected={selected} onSelect={setSelected} marked={marked} />
        </Card>

        <SectionTitle>
          {selected === today ? t.agenda.today : parseIso(selected).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
        </SectionTitle>
        <Card style={{ paddingVertical: space.xs }}>
          {ofDay.length ? ofDay.map((x) => <TaskRow key={x.id} task={x} />) : <EmptyState icon="calendar-blank-outline" title={t.agenda.empty} />}
        </Card>

        {overdue.length && selected === today ? (
          <>
            <SectionTitle>{t.agenda.overdue}</SectionTitle>
            <Card style={{ paddingVertical: space.xs, borderColor: theme.danger }}>
              {overdue.map((x) => <TaskRow key={x.id} task={x} />)}
            </Card>
          </>
        ) : null}

        {noDate.length ? (
          <>
            <SectionTitle>{t.agenda.noDate}</SectionTitle>
            <Card style={{ paddingVertical: space.xs }}>{noDate.map((x) => <TaskRow key={x.id} task={x} />)}</Card>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm },
  week: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  cellText: { width: `${100 / 7}%`, textAlign: 'center', textTransform: 'uppercase' },
  day: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
});
