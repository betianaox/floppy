import { create } from 'zustand';

import { backend } from '@/lib/backend';
import { monthKey } from '@/lib/dates';
import type { CaptureInput, CaptureResult, Expense, Saved, Task } from '@/lib/types';

interface DataState {
  tasks: Task[];
  expenses: Expense[];
  month: string;
  saved: Saved[];
  loading: boolean;
  error: string | null;
  /** Lo último que se cargó, para mostrar qué entendió la IA. */
  lastResult: CaptureResult | null;
  capturing: boolean;
  refresh: () => Promise<void>;
  setMonth: (month: string) => Promise<void>;
  toggleTask: (t: Task) => Promise<void>;
  removeTask: (id: number) => Promise<void>;
  removeExpense: (id: number) => Promise<void>;
  removeSaved: (id: number) => Promise<void>;
  capture: (input: CaptureInput) => Promise<CaptureResult | null>;
  clearResult: () => void;
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export const useData = create<DataState>((set, get) => ({
  tasks: [],
  expenses: [],
  month: monthKey(),
  saved: [],
  loading: false,
  error: null,
  lastResult: null,
  capturing: false,

  async refresh() {
    set({ loading: true, error: null });
    try {
      const [tasks, expenses, saved] = await Promise.all([backend.tasks(), backend.expenses(get().month), backend.saved()]);
      set({ tasks, expenses, saved });
    } catch (e) {
      set({ error: message(e) });
    } finally {
      set({ loading: false });
    }
  },

  async setMonth(month) {
    set({ month });
    try {
      set({ expenses: await backend.expenses(month) });
    } catch (e) {
      set({ error: message(e) });
    }
  },

  async toggleTask(t) {
    // Se marca al instante y después se confirma con el servidor.
    set({ tasks: get().tasks.map((x) => (x.id === t.id ? { ...x, done: !t.done } : x)) });
    try {
      await backend.setTaskDone(t.id, !t.done);
    } catch (e) {
      set({ tasks: get().tasks.map((x) => (x.id === t.id ? t : x)), error: message(e) });
    }
  },

  async removeTask(id) {
    const prev = get().tasks;
    set({ tasks: prev.filter((x) => x.id !== id) });
    try { await backend.deleteTask(id); } catch (e) { set({ tasks: prev, error: message(e) }); }
  },

  async removeExpense(id) {
    const prev = get().expenses;
    set({ expenses: prev.filter((x) => x.id !== id) });
    try { await backend.deleteExpense(id); } catch (e) { set({ expenses: prev, error: message(e) }); }
  },

  async removeSaved(id) {
    const prev = get().saved;
    set({ saved: prev.filter((x) => x.id !== id) });
    try { await backend.deleteSaved(id); } catch (e) { set({ saved: prev, error: message(e) }); }
  },

  async capture(input) {
    set({ capturing: true, error: null });
    try {
      const result = await backend.capture(input);
      set({ lastResult: result });
      await get().refresh();
      return result;
    } catch (e) {
      set({ error: message(e) });
      return null;
    } finally {
      set({ capturing: false });
    }
  },

  clearResult: () => set({ lastResult: null }),
}));
