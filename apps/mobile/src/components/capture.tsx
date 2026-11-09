import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { File } from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useI18n } from '@/i18n';
import { backend } from '@/lib/backend';
import { isDemo } from '@/lib/config';
import { radius, space, useTheme } from '@/lib/theme';
import { useData } from '@/state/data';

import { Button, Icon, Txt, useDayLabel, type IconName } from './ui';

/** Lee un archivo local como base64 (en web, a partir de un blob). */
async function toBase64(uri: string): Promise<string> {
  if (Platform.OS !== 'web') return new File(uri).base64();
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function Action({ icon, label, onPress, primary }: { icon: IconName; label: string; onPress: () => void; primary?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.action, { opacity: pressed ? 0.75 : 1 }]}
    >
      <View
        style={[
          styles.actionCircle,
          primary
            ? { backgroundColor: theme.primary, width: 76, height: 76, borderRadius: 38 }
            : { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 },
        ]}
      >
        <Icon name={icon} size={primary ? 34 : 24} color={primary ? theme.onPrimary : theme.primary} />
      </View>
      <Txt variant="small" style={{ fontWeight: '600' }}>
        {label}
      </Txt>
    </Pressable>
  );
}

/**
 * La puerta de entrada de Floppy: hablar, sacar una foto, escribir o pegar un
 * enlace. Todo va al mismo lugar y la IA decide si es tarea, gasto o guardado.
 */
export function CaptureBar() {
  const theme = useTheme();
  const { t } = useI18n();
  const capture = useData((s) => s.capture);
  const capturing = useData((s) => s.capturing);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const rec = useAudioRecorderState(recorder, 250);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!rec.isRecording) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [rec.isRecording, pulse]);

  async function startRecording() {
    if (isDemo && Platform.OS === 'web') {
      // En la web de demostración no se graba: se simula una nota de voz.
      await capture({ kind: 'audio', data: '', mimeType: 'audio/m4a' });
      return;
    }
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) return Alert.alert(t.permissions.mic);
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  }

  async function stopRecording() {
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false });
    const uri = recorder.uri;
    if (!uri) return;
    const data = await toBase64(uri);
    const mimeType = Platform.OS === 'web' ? 'audio/webm' : 'audio/mp4';
    await capture({ kind: 'audio', data, mimeType });
  }

  async function takePhoto() {
    let result: ImagePicker.ImagePickerResult;
    if (Platform.OS === 'web') {
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    } else {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return Alert.alert(t.permissions.camera);
      result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    }
    if (result.canceled || !result.assets[0]) return;
    // Se achica antes de enviarla: alcanza para leer un ticket y pesa mucho menos.
    const small = await manipulateAsync(result.assets[0].uri, [{ resize: { width: 1280 } }], {
      compress: 0.7,
      format: SaveFormat.JPEG,
      base64: true,
    });
    const data = small.base64 ?? '';
    const photoPath = await backend.uploadPhoto(data, 'image/jpeg');
    await capture({ kind: 'image', data, mimeType: 'image/jpeg', photoPath });
  }

  if (capturing) {
    return (
      <View style={[styles.box, { backgroundColor: theme.primarySoft }]}>
        <ActivityIndicator color={theme.primary} size="large" />
        <Txt variant="heading" color={theme.primaryDark}>
          {t.home.thinking}
        </Txt>
      </View>
    );
  }

  if (rec.isRecording) {
    const secs = Math.floor(rec.durationMillis / 1000);
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={t.home.tapToStop} onPress={stopRecording} style={[styles.box, { backgroundColor: theme.primarySoft }]}>
        <Animated.View style={[styles.recordDot, { backgroundColor: theme.primary, transform: [{ scale: pulse }] }]}>
          <Icon name="stop" size={34} color={theme.onPrimary} />
        </Animated.View>
        <Txt variant="heading" color={theme.primaryDark}>
          {t.home.listening} {`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`}
        </Txt>
        <Txt muted>{t.home.tapToStop}</Txt>
      </Pressable>
    );
  }

  return (
    <View style={[styles.box, { backgroundColor: theme.surfaceAlt }]}>
      <Txt variant="heading">{t.home.prompt}</Txt>
      <Txt variant="small" muted style={{ textAlign: 'center' }}>
        {t.home.hint}
      </Txt>
      <View style={styles.actions}>
        <Action icon="camera-outline" label={t.home.photo} onPress={takePhoto} />
        <Action icon="microphone-outline" label={t.home.speak} onPress={startRecording} primary />
        <Action icon="pencil-outline" label={t.home.write} onPress={() => router.push('/escribir')} />
        <Action icon="link-variant" label={t.home.link} onPress={() => router.push({ pathname: '/escribir', params: { modo: 'enlace' } })} />
      </View>
    </View>
  );
}

/** Muestra lo que la IA entendió y guardó después de cada carga. */
export function ResultSheet() {
  const theme = useTheme();
  const { t, money } = useI18n();
  const dayLabel = useDayLabel();
  const result = useData((s) => s.lastResult);
  const clear = useData((s) => s.clearResult);
  if (!result) return null;

  const Row = ({ icon, title, detail }: { icon: IconName; title: string; detail?: string }) => (
    <View style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: theme.primarySoft }]}>
        <Icon name={icon} size={18} color={theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt style={{ fontWeight: '600' }}>{title}</Txt>
        {detail ? (
          <Txt variant="small" muted>
            {detail}
          </Txt>
        ) : null}
      </View>
    </View>
  );

  return (
    <Modal transparent animationType="slide" visible onRequestClose={clear}>
      <Pressable style={styles.backdrop} onPress={clear} />
      <View style={[styles.sheet, { backgroundColor: theme.surface }]}>
        <View style={[styles.grabber, { backgroundColor: theme.border }]} />
        <Txt variant="title">{t.result.title}</Txt>
        <Txt muted>{result.summary}</Txt>
        <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: space.md, paddingVertical: space.md }}>
          {result.tasks.map((x, i) => (
            <Row key={`t${i}`} icon="calendar-check-outline" title={x.title} detail={x.due_date ? dayLabel(x.due_date) : t.agenda.noDate} />
          ))}
          {result.expenses.map((x, i) => (
            <Row key={`e${i}`} icon="receipt-text-outline" title={`${money(x.amount, x.currency)} · ${x.merchant ?? t.categories[x.category]}`} detail={t.categories[x.category]} />
          ))}
          {result.saved.map((x, i) => (
            <Row key={`s${i}`} icon={x.kind === 'link' ? 'link-variant' : x.kind === 'photo' ? 'image-outline' : 'note-text-outline'} title={x.title} detail={x.summary ?? undefined} />
          ))}
          {result.transcript ? (
            <View style={{ marginTop: space.sm }}>
              <Txt variant="label" muted>
                {t.result.heard}
              </Txt>
              <Txt variant="small" muted style={{ fontStyle: 'italic', marginTop: 4 }}>
                {result.transcript}
              </Txt>
            </View>
          ) : null}
        </ScrollView>
        <Button label={t.result.ok} onPress={clear} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.lg, padding: space.xl, alignItems: 'center', gap: space.sm, minHeight: 210, justifyContent: 'center' },
  actions: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', alignSelf: 'stretch', marginTop: space.md },
  action: { alignItems: 'center', gap: 6, minWidth: 64 },
  actionCircle: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  recordDot: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { padding: space.xl, paddingBottom: space.xxl, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, gap: space.xs },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: space.md },
  row: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  rowIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
