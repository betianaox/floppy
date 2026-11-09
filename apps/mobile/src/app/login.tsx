import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorBanner, Txt } from '@/components/ui';
import { fill, useI18n } from '@/i18n';
import { isDemo } from '@/lib/config';
import { radius, space, useTheme } from '@/lib/theme';
import { sendCode, useSession, verifyCode } from '@/state/session';

export default function Login() {
  const theme = useTheme();
  const { t } = useI18n();
  const enterDemo = useSession((s) => s.enterDemo);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const input = [styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }];

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <View style={styles.brand}>
          <Image source={require('../../assets/images/logo.png')} style={{ width: 120, height: 126, tintColor: theme.wordmarkTint }} resizeMode="contain" />
          <Image source={require('../../assets/images/wordmark.png')} style={{ width: 170, height: 52, tintColor: theme.wordmarkTint }} resizeMode="contain" />
          <Txt muted style={{ textAlign: 'center', maxWidth: 300 }}>
            {t.login.tagline}
          </Txt>
        </View>

        {error ? <ErrorBanner message={error} /> : null}

        {isDemo ? (
          <View style={{ gap: space.md }}>
            <Button label={t.login.demo} icon="play-circle-outline" onPress={enterDemo} />
            <Txt variant="small" muted style={{ textAlign: 'center' }}>
              {t.login.demoNote}
            </Txt>
          </View>
        ) : step === 'email' ? (
          <View style={{ gap: space.md }}>
            <TextInput
              style={input}
              placeholder={t.login.email}
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Button
              label={t.login.sendCode}
              loading={busy}
              disabled={!/^\S+@\S+\.\S+$/.test(email)}
              onPress={() => run(async () => { await sendCode(email.trim()); setStep('code'); })}
            />
          </View>
        ) : (
          <View style={{ gap: space.md }}>
            <Txt muted style={{ textAlign: 'center' }}>
              {fill(t.login.codeSent, { email })}
            </Txt>
            <TextInput
              style={[input, { textAlign: 'center', fontSize: 24, letterSpacing: 8 }]}
              placeholder={t.login.code}
              placeholderTextColor={theme.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
            />
            <Button label={t.login.enter} loading={busy} disabled={code.length !== 6} onPress={() => run(() => verifyCode(email.trim(), code))} />
            <Button kind="ghost" label={t.login.otherEmail} onPress={() => { setStep('email'); setCode(''); }} />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: space.xl, gap: space.xl },
  brand: { alignItems: 'center', gap: space.md },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.lg, paddingVertical: 14, fontSize: 16 },
});
