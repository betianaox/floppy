import type { Session } from '@supabase/supabase-js';
import { useEffect } from 'react';
import { create } from 'zustand';

import { isDemo } from '@/lib/config';
import { supabase } from '@/lib/supabase';

interface SessionState {
  ready: boolean;
  session: Session | null;
  /** En modo demo se entra sin cuenta. */
  demoSignedIn: boolean;
  enterDemo: () => void;
  signOut: () => Promise<void>;
}

export const useSession = create<SessionState>((set) => ({
  ready: isDemo,
  session: null,
  demoSignedIn: false,
  enterDemo: () => set({ demoSignedIn: true }),
  signOut: async () => {
    if (supabase) await supabase.auth.signOut();
    set({ session: null, demoSignedIn: false });
  },
}));

export const useSignedIn = () => useSession((s) => (isDemo ? s.demoSignedIn : !!s.session));

/** Escucha la sesión de Supabase y la deja en el estado. */
export function useSessionListener() {
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => useSession.setState({ session: data.session, ready: true }));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => useSession.setState({ session, ready: true }));
    return () => data.subscription.unsubscribe();
  }, []);
}

/** Paso 1 del ingreso: manda un código de 6 dígitos al correo. */
export async function sendCode(email: string) {
  if (!supabase) return;
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw error;
}

/** Paso 2: verifica el código y abre la sesión. */
export async function verifyCode(email: string, token: string) {
  if (!supabase) return;
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
}
