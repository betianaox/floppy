import { decode } from 'base64-arraybuffer';

import { config, isDemo } from './config';
import { demoBackend } from './demo';
import { supabase } from './supabase';
import type { CaptureInput, CaptureResult, Expense, Saved, SearchResult, Task } from './types';

/**
 * Todo lo que la app le pide al servidor. Hay dos implementaciones con la misma
 * forma: la real (Supabase para leer y editar, n8n para entender y guardar) y la
 * de demostración, en memoria.
 */
export interface Backend {
  tasks(): Promise<Task[]>;
  setTaskDone(id: number, done: boolean): Promise<void>;
  deleteTask(id: number): Promise<void>;
  expenses(month: string): Promise<Expense[]>;
  deleteExpense(id: number): Promise<void>;
  saved(): Promise<Saved[]>;
  deleteSaved(id: number): Promise<void>;
  /** Sube una foto a la carpeta de la persona y devuelve su ruta. */
  uploadPhoto(base64: string, mimeType: string): Promise<string>;
  /** URL temporal para mostrar una foto guardada. */
  photoUrl(path: string): Promise<string | null>;
  capture(input: CaptureInput): Promise<CaptureResult>;
  search(q: string): Promise<SearchResult>;
  deleteAccount(): Promise<void>;
}

function db() {
  if (!supabase) throw new Error('Supabase no está configurado');
  return supabase;
}

async function token(): Promise<string> {
  const { data } = await db().auth.getSession();
  const t = data.session?.access_token;
  if (!t) throw new Error('Sin sesión');
  return t;
}

/** Llama a un flujo de n8n con la sesión de la persona. */
async function n8n<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${config.n8nUrl}/webhook/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new Error('Tu sesión venció. Vuelve a entrar.');
  if (!res.ok) throw new Error(`El servidor respondió ${res.status}`);
  return (await res.json()) as T;
}

function check<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

const realBackend: Backend = {
  async tasks() {
    return check(
      await db().from('tasks').select('id,title,due_date,notes,done,source,created_at')
        .order('done').order('due_date', { nullsFirst: false }).order('created_at', { ascending: false }),
    ) as Task[];
  },
  async setTaskDone(id, done) {
    check(await db().from('tasks').update({ done }).eq('id', id));
  },
  async deleteTask(id) {
    check(await db().from('tasks').delete().eq('id', id));
  },
  async expenses(month) {
    const [y, m] = month.split('-').map(Number);
    const next = new Date(y!, m!, 1);
    const end = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;
    return check(
      await db().from('expenses')
        .select('id,merchant,amount,currency,category,spent_on,items,photo_path,source,created_at')
        .gte('spent_on', month).lt('spent_on', end).order('spent_on', { ascending: false }),
    ) as Expense[];
  },
  async deleteExpense(id) {
    check(await db().from('expenses').delete().eq('id', id));
  },
  async saved() {
    return check(
      await db().from('saved').select('id,kind,title,summary,content,url,photo_path,tags,source,created_at')
        .order('created_at', { ascending: false }),
    ) as Saved[];
  },
  async deleteSaved(id) {
    check(await db().from('saved').delete().eq('id', id));
  },
  async uploadPhoto(base64, mimeType) {
    const { data } = await db().auth.getUser();
    const uid = data.user?.id;
    if (!uid) throw new Error('Sin sesión');
    const ext = mimeType.includes('png') ? 'png' : 'jpg';
    const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    check(await db().storage.from('photos').upload(path, decode(base64), { contentType: mimeType }));
    return path;
  },
  async photoUrl(path) {
    const { data } = await db().storage.from('photos').createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  },
  async capture(input) {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return n8n<CaptureResult>('floppy', { ...input, tz });
  },
  async search(q) {
    return n8n<SearchResult>('floppy-buscar', { q });
  },
  async deleteAccount() {
    await n8n('floppy-cuenta', { confirm: true });
    await db().auth.signOut();
  },
};

export const backend: Backend = isDemo ? demoBackend : realBackend;
