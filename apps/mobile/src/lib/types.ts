export type Source = 'audio' | 'image' | 'text' | 'link';

export interface Task {
  id: number;
  title: string;
  due_date: string | null;
  notes: string | null;
  done: boolean;
  source: Source;
  created_at: string;
}

export const CATEGORIES = [
  'Supermercado',
  'Comida',
  'Transporte',
  'Hogar',
  'Servicios',
  'Salud',
  'Mascotas',
  'Ropa',
  'Ocio',
  'Otros',
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Expense {
  id: number;
  merchant: string | null;
  amount: number;
  currency: string;
  category: Category;
  spent_on: string;
  items: { name: string; amount?: number | null }[] | null;
  photo_path: string | null;
  source: Source;
  created_at: string;
}

export type SavedKind = 'note' | 'link' | 'photo';

export interface Saved {
  id: number;
  kind: SavedKind;
  title: string;
  summary: string | null;
  content: string | null;
  url: string | null;
  photo_path: string | null;
  tags: string[];
  source: Source;
  created_at: string;
}

/** Lo que la app le manda a n8n. */
export type CaptureInput =
  | { kind: 'text'; text: string }
  | { kind: 'link'; url: string; text?: string }
  | { kind: 'audio'; data: string; mimeType: string }
  | { kind: 'image'; data: string; mimeType: string; photoPath?: string };

/** Lo que n8n contesta: lo que entendió y guardó. */
export interface CaptureResult {
  summary: string;
  transcript: string;
  tasks: Omit<Task, 'id' | 'done' | 'source' | 'created_at'>[];
  expenses: Omit<Expense, 'id' | 'source' | 'created_at'>[];
  saved: Omit<Saved, 'id' | 'source' | 'created_at'>[];
}

export interface SearchHit {
  type: 'task' | 'expense' | 'saved';
  id: number;
  title: string;
  detail: string;
  date: string | null;
}

export interface SearchResult {
  answer: string;
  results: SearchHit[];
}
