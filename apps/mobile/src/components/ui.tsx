import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/i18n';
import { isDemo } from '@/lib/config';
import { addDays, isoDate } from '@/lib/dates';
import { radius, space, useTheme } from '@/lib/theme';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Iconos de línea, de un solo color. */
export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: string }) {
  const theme = useTheme();
  return <MaterialCommunityIcons name={name} size={size} color={color ?? theme.text} />;
}

type Variant = 'title' | 'heading' | 'body' | 'small' | 'label' | 'number';
const VARIANTS: Record<Variant, TextStyle> = {
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  heading: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 21 },
  small: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  number: { fontSize: 30, fontWeight: '800', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
};

export function Txt({
  variant = 'body',
  muted,
  color,
  style,
  children,
  numberOfLines,
  onPress,
}: {
  variant?: Variant;
  muted?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
  onPress?: () => void;
}) {
  const theme = useTheme();
  return (
    <Text onPress={onPress} suppressHighlighting numberOfLines={numberOfLines} style={[VARIANTS[variant], { color: color ?? (muted ? theme.textMuted : theme.text) }, style]}>
      {children}
    </Text>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const theme = useTheme();
  const base = [styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.85 }]}>
      {children}
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  icon,
  kind = 'primary',
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  kind?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const bg = { primary: theme.primary, secondary: theme.surfaceAlt, danger: 'transparent', ghost: 'transparent' }[kind];
  const fg = { primary: theme.onPrimary, secondary: theme.text, danger: theme.danger, ghost: theme.primary }[kind];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: kind === 'danger' ? theme.danger : 'transparent', opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={20} color={fg} /> : null}
      <Txt style={{ color: fg, fontWeight: '700' }}>{label}</Txt>
    </Pressable>
  );
}

export function Chip({ label, active, onPress, color }: { label: string; active?: boolean; onPress?: () => void; color?: string }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, { backgroundColor: active ? theme.primary : theme.surface, borderColor: active ? theme.primary : theme.border }]}
    >
      {color ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      <Txt variant="small" style={{ color: active ? theme.onPrimary : theme.text, fontWeight: '600' }}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, color }: { icon: IconName; onPress: () => void; label: string; color?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={10} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 4 })}>
      <Icon name={icon} color={color} />
    </Pressable>
  );
}

export function DemoBadge() {
  const theme = useTheme();
  const { t } = useI18n();
  if (!isDemo) return null;
  return (
    <View style={[styles.badge, { backgroundColor: theme.primarySoft }]}>
      <Txt variant="label" color={theme.primaryDark} style={{ fontSize: 10 }}>
        {t.demo}
      </Txt>
    </View>
  );
}

/** Encabezado de cada pantalla principal: el logotipo o un título, y Ajustes. */
export function ScreenHeader({ title, right }: { title?: string; right?: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  return (
    <View style={[styles.header, { paddingTop: insets.top + space.sm }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flex: 1 }}>
        {title ? (
          <Txt variant="title">{title}</Txt>
        ) : (
          <Image
            source={require('../../assets/images/wordmark.png')}
            accessibilityLabel="Floppy"
            style={{ width: 104, height: 32, tintColor: theme.wordmarkTint }}
            resizeMode="contain"
          />
        )}
        <DemoBadge />
      </View>
      {right}
      <Pressable accessibilityRole="button" accessibilityLabel={t.settings.title} hitSlop={10} onPress={() => router.push('/ajustes')}>
        <Icon name="cog-outline" />
      </Pressable>
    </View>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <Txt variant="label" muted>
        {children}
      </Txt>
      {right}
    </View>
  );
}

export function EmptyState({ icon, title, hint }: { icon: IconName; title: string; hint?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}>
        <Icon name={icon} size={30} color={theme.primary} />
      </View>
      <Txt variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </Txt>
      {hint ? (
        <Txt muted style={{ textAlign: 'center' }}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <View style={[styles.error, { borderColor: theme.danger }]}>
      <Icon name="alert-circle-outline" color={theme.danger} />
      <Txt variant="small" style={{ flex: 1 }}>
        {message}
      </Txt>
      {onRetry ? <Button kind="ghost" label={t.common.retry} onPress={onRetry} /> : null}
    </View>
  );
}

/** "Hoy", "Mañana", "Ayer" o la fecha corta. */
export function useDayLabel() {
  const { t, locale } = useI18n();
  return (iso: string | null) => {
    if (!iso) return '';
    const today = new Date();
    if (iso === isoDate(today)) return t.common.today;
    if (iso === isoDate(addDays(today, 1))) return t.common.tomorrow;
    if (iso === isoDate(addDays(today, -1))) return t.common.yesterday;
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y!, m! - 1, d!).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  };
}

export const SOURCE_ICONS: Record<string, IconName> = {
  audio: 'microphone-outline',
  image: 'camera-outline',
  text: 'pencil-outline',
  link: 'link-variant',
};

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, padding: space.lg },
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: space.md,
    paddingVertical: 7,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.md },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xl, marginBottom: space.sm },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.xxl, paddingHorizontal: space.xl },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  error: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1, borderRadius: radius.md, padding: space.md, marginBottom: space.md },
});
