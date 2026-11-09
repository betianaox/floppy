import type { Backend } from './backend';
import { addDays, isoDate, parseIso } from './dates';
import type { CaptureInput, CaptureResult, Category, Expense, Saved, SearchHit, Task } from './types';

// Modo demo: datos de ejemplo en memoria y una "IA" de mentira que reconoce
// frases simples. Sirve para probar la app sin servidor y para las capturas.
// Se nota en la app con la etiqueta "Demo".

const hoy = new Date();
const d = (n: number) => isoDate(addDays(hoy, n));
const ts = (n: number) => addDays(hoy, n).toISOString();
let nextId = 1000;

const tasks: Task[] = [
  { id: 1, title: 'Llamar al contador', due_date: d(0), notes: 'Por la declaración de ganancias', done: false, source: 'audio', created_at: ts(-1) },
  { id: 2, title: 'Pagar la luz', due_date: d(0), notes: null, done: true, source: 'image', created_at: ts(-2) },
  { id: 3, title: 'Comprar alimento para el perro', due_date: d(1), notes: null, done: false, source: 'audio', created_at: ts(-1) },
  { id: 4, title: 'Turno con la dentista', due_date: d(3), notes: '10:30 h', done: false, source: 'text', created_at: ts(-3) },
  { id: 5, title: 'Regalo para el cumple de Sofi', due_date: d(5), notes: 'Le gustan las plantas', done: false, source: 'audio', created_at: ts(-2) },
  { id: 6, title: 'Renovar el seguro del auto', due_date: d(9), notes: null, done: false, source: 'text', created_at: ts(-4) },
  { id: 7, title: 'Devolver el libro a Juli', due_date: null, notes: null, done: false, source: 'text', created_at: ts(-5) },
];

const exp = (id: number, merchant: string | null, amount: number, category: Category, n: number, items: Expense['items'] = null, source: Expense['source'] = 'image'): Expense => ({
  id, merchant, amount, currency: 'ARS', category, spent_on: d(n), items, photo_path: null, source, created_at: ts(n),
});

const expenses: Expense[] = [
  exp(1, 'Supermercado Día', 48230, 'Supermercado', 0, [{ name: 'Leche', amount: 1890 }, { name: 'Pan', amount: 2600 }, { name: 'Café', amount: 9800 }]),
  exp(2, 'Farmacia Central', 8450, 'Salud', -1, [{ name: 'Ibuprofeno', amount: 3200 }]),
  exp(3, 'Uber', 6300, 'Transporte', -1, null, 'audio'),
  exp(4, 'Edesur', 31200, 'Servicios', -2),
  exp(5, 'Pet shop Patitas', 46000, 'Mascotas', -3),
  exp(6, 'Café Martínez', 7900, 'Comida', -3, null, 'audio'),
  exp(7, 'Cine Hoyts', 18000, 'Ocio', -5, null, 'text'),
  exp(8, 'Verdulería', 9600, 'Supermercado', -6, null, 'audio'),
  exp(9, 'Zara', 64000, 'Ropa', -8),
  exp(10, 'Sube', 10000, 'Transporte', -9, null, 'text'),
  exp(11, 'Pizzería Popular', 22500, 'Comida', -11),
  exp(12, 'Ferretería', 13400, 'Hogar', -12),
  exp(13, 'Supermercado Coto', 72300, 'Supermercado', -35),
  exp(14, 'Personal', 18900, 'Servicios', -38),
  exp(15, 'Restaurante', 41000, 'Comida', -42),
];

const saved: Saved[] = [
  { id: 1, kind: 'link', title: 'Pan casero sin amasar', summary: 'Receta de pan con harina, agua, sal y levadura; 12 horas de reposo y horno fuerte.', content: null, url: 'https://www.youtube.com/watch?v=pan-casero', photo_path: null, tags: ['receta', 'cocina'], source: 'link', created_at: ts(-2) },
  { id: 2, kind: 'note', title: 'Ideas para el cumple de Sofi', summary: 'Una planta colgante, un libro de Mariana Enríquez o una clase de cerámica.', content: null, url: null, photo_path: null, tags: ['regalos', 'sofi'], source: 'audio', created_at: ts(-2) },
  { id: 3, kind: 'link', title: 'Rutina de estiramientos de 10 minutos', summary: 'Ejercicios para la espalda y el cuello, para hacer después de trabajar sentada.', content: null, url: 'https://www.youtube.com/watch?v=estiramientos', photo_path: null, tags: ['salud', 'ejercicio'], source: 'link', created_at: ts(-4) },
  { id: 4, kind: 'photo', title: 'Pizarrón de vinos del bar', summary: 'Malbec de Mendoza recomendado por la moza: "Cadus Appellation".', content: null, url: null, photo_path: null, tags: ['vinos'], source: 'image', created_at: ts(-6) },
  { id: 5, kind: 'note', title: 'Pintar el living de verde salvia', summary: 'Idea para la casa: pared del fondo en verde salvia y estantes de madera clara.', content: null, url: null, photo_path: null, tags: ['casa', 'ideas'], source: 'audio', created_at: ts(-7) },
  { id: 6, kind: 'link', title: 'Escapada a Tilcara', summary: 'Guía de 3 días: Purmamarca, la Garganta del Diablo y peñas a la noche.', content: null, url: 'https://ejemplo.com/tilcara-3-dias', photo_path: null, tags: ['viaje'], source: 'link', created_at: ts(-10) },
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── La "IA" de mentira ─────────────────────────────────────────────────────

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const CATEGORIAS: [RegExp, Category][] = [
  [/s[uú]per|almac[eé]n|verduler|carnicer/i, 'Supermercado'],
  [/caf[eé]|almuerzo|cena|pizza|resto|comida|helado/i, 'Comida'],
  [/uber|taxi|nafta|colectivo|sube|tren|peaje/i, 'Transporte'],
  [/farmacia|m[eé]dic|dentista|remedio/i, 'Salud'],
  [/luz|gas|agua|internet|celular|expensas|edesur|metrogas/i, 'Servicios'],
  [/perro|gato|veterinari|pet/i, 'Mascotas'],
  [/ropa|zapatilla|remera|campera/i, 'Ropa'],
  [/cine|teatro|recital|libro|juego/i, 'Ocio'],
  [/ferreter|mueble|casa|limpieza/i, 'Hogar'],
];

function fechaDe(texto: string): string | null {
  const t = texto.toLowerCase();
  if (/pasado mañana/.test(t)) return d(2);
  if (/mañana/.test(t)) return d(1);
  if (/\bhoy\b/.test(t)) return d(0);
  const dia = DIAS.findIndex((x) => t.includes(x));
  if (dia >= 0) {
    const diff = (dia - hoy.getDay() + 7) % 7 || 7;
    return d(diff);
  }
  return null;
}

function titulo(frase: string): string {
  const limpia = frase
    .replace(/\b(pasado mañana|mañana|hoy|el (lunes|martes|miércoles|jueves|viernes|sábado|domingo))\b/gi, '')
    .replace(/^\s*(tengo que|hay que|acordarme de|recordame|recuérdame)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return limpia.charAt(0).toUpperCase() + limpia.slice(1);
}

function entenderTexto(texto: string): CaptureResult {
  const out: CaptureResult = { summary: '', transcript: texto, tasks: [], expenses: [], saved: [] };
  const frases = texto.split(/,|\by\b|\.|;/i).map((s) => s.trim()).filter(Boolean);
  for (const f of frases) {
    const gasto = f.match(/(gast[eé]|pagu[eé]|me sali[oó]|compr[eé])\D*([\d.]+)/i);
    if (gasto) {
      const amount = Number(gasto[2]!.replace(/\./g, ''));
      const cat = CATEGORIAS.find(([re]) => re.test(f))?.[1] ?? 'Otros';
      const lugar = f.match(/\ben (el |la )?(.+)$/i)?.[2] ?? null;
      out.expenses.push({ merchant: lugar ? titulo(lugar) : null, amount, currency: 'ARS', category: cat, spent_on: d(0), items: null, photo_path: null });
    } else if (/^(idea|guardar|anotar|nota)\b/i.test(f)) {
      const t = titulo(f.replace(/^(idea( de| para)?|guardar|anotar|nota)\s*:?\s*/i, ''));
      out.saved.push({ kind: 'note', title: t, summary: null, content: f, url: null, photo_path: null, tags: ['ideas'] });
    } else if (f.split(' ').length >= 2) {
      out.tasks.push({ title: titulo(f), due_date: fechaDe(f), notes: null });
    }
  }
  out.summary = resumen(out);
  return out;
}

function resumen(r: CaptureResult): string {
  const partes = [
    r.tasks.length && `${r.tasks.length} ${r.tasks.length === 1 ? 'tarea' : 'tareas'}`,
    r.expenses.length && `${r.expenses.length} ${r.expenses.length === 1 ? 'gasto' : 'gastos'}`,
    r.saved.length && `${r.saved.length} ${r.saved.length === 1 ? 'guardado' : 'guardados'}`,
  ].filter(Boolean);
  return partes.length ? `Listo: ${partes.join(', ')}.` : 'No encontré tareas, gastos ni nada para guardar.';
}

function entender(input: CaptureInput): CaptureResult {
  switch (input.kind) {
    case 'text':
      return entenderTexto(input.text);
    case 'link': {
      let host = input.url;
      try { host = new URL(input.url).hostname.replace(/^www\./, ''); } catch {}
      const r: CaptureResult = {
        summary: '', transcript: '', tasks: [], expenses: [],
        saved: [{ kind: 'link', title: `Enlace de ${host}`, summary: 'En el modo demo no se lee la página: con el servidor, aquí va un resumen de lo que trata.', content: null, url: input.url, photo_path: null, tags: ['enlace'] }],
      };
      r.summary = resumen(r);
      return r;
    }
    case 'audio':
      // En demo no hay transcripción: se simula una nota de voz típica.
      return entenderTexto('Mañana llamar a la veterinaria, y gasté 12500 en el súper');
    case 'image': {
      const r: CaptureResult = {
        summary: '', transcript: 'Ticket de Farmacia Central', tasks: [], saved: [],
        expenses: [{ merchant: 'Farmacia Central', amount: 15890, currency: 'ARS', category: 'Salud', spent_on: d(0), items: [{ name: 'Protector solar', amount: 12400 }, { name: 'Curitas', amount: 3490 }], photo_path: input.photoPath ?? null }],
      };
      r.summary = resumen(r);
      return r;
    }
  }
}

function guardar(r: CaptureResult, source: Task['source']) {
  const now = new Date().toISOString();
  for (const t of r.tasks) tasks.unshift({ ...t, id: nextId++, done: false, source, created_at: now });
  for (const g of r.expenses) expenses.unshift({ ...g, spent_on: g.spent_on || d(0), id: nextId++, source, created_at: now });
  for (const s of r.saved) saved.unshift({ ...s, id: nextId++, source, created_at: now });
}

function buscar(q: string): SearchHit[] {
  const plano = (x: string) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const palabras = plano(q).split(/\s+/).filter((w) => w.length > 2 && !['cuanto', 'gaste', 'para', 'que', 'los', 'las', 'del'].includes(w));
  const score = (texto: string) => palabras.filter((w) => plano(texto).includes(w.replace(/s$/, ''))).length;
  const hits: (SearchHit & { s: number })[] = [
    ...tasks.map((t) => ({ type: 'task' as const, id: t.id, title: t.title, detail: t.notes ?? '', date: t.due_date, s: score(`${t.title} ${t.notes ?? ''}`) })),
    ...expenses.map((g) => ({ type: 'expense' as const, id: g.id, title: g.merchant ?? g.category, detail: `${g.category} · ARS ${g.amount}`, date: g.spent_on, s: score(`${g.merchant ?? ''} ${g.category} gasto gastos`) })),
    ...saved.map((s) => ({ type: 'saved' as const, id: s.id, title: s.title, detail: s.summary ?? '', date: s.created_at.slice(0, 10), s: score(`${s.title} ${s.summary ?? ''} ${s.tags.join(' ')}`) })),
  ];
  return hits.filter((h) => h.s > 0).sort((a, b) => b.s - a.s).slice(0, 8).map(({ s: _s, ...h }) => h);
}

export const demoBackend: Backend = {
  async tasks() {
    await wait(150);
    return [...tasks].sort((a, b) => Number(a.done) - Number(b.done) || (a.due_date ?? '9').localeCompare(b.due_date ?? '9'));
  },
  async setTaskDone(id, done) {
    const t = tasks.find((x) => x.id === id);
    if (t) t.done = done;
  },
  async deleteTask(id) {
    tasks.splice(tasks.findIndex((x) => x.id === id), 1);
  },
  async expenses(month) {
    await wait(150);
    const m = parseIso(month);
    return expenses
      .filter((g) => { const x = parseIso(g.spent_on); return x.getFullYear() === m.getFullYear() && x.getMonth() === m.getMonth(); })
      .sort((a, b) => b.spent_on.localeCompare(a.spent_on));
  },
  async deleteExpense(id) {
    expenses.splice(expenses.findIndex((x) => x.id === id), 1);
  },
  async saved() {
    await wait(150);
    return [...saved];
  },
  async deleteSaved(id) {
    saved.splice(saved.findIndex((x) => x.id === id), 1);
  },
  async uploadPhoto() {
    return `demo/${Date.now()}.jpg`;
  },
  async photoUrl() {
    return null;
  },
  async capture(input) {
    await wait(1200);
    const r = entender(input);
    guardar(r, input.kind);
    return r;
  },
  async search(q) {
    await wait(700);
    const results = buscar(q);
    const gastos = results.filter((r) => r.type === 'expense');
    let answer = results.length
      ? results.length === 1 ? 'Encontré 1 cosa relacionada.' : `Encontré ${results.length} cosas relacionadas.`
      : 'No encontré nada guardado que se parezca.';
    if (gastos.length && /cu[aá]nto/i.test(q)) {
      const total = gastos.reduce((s, r) => s + Number(r.detail.split('ARS ')[1] ?? 0), 0);
      answer = gastos.length === 1 ? `Fue 1 gasto de ARS ${total.toLocaleString('es-AR')}.` : `Suman ARS ${total.toLocaleString('es-AR')} en ${gastos.length} gastos.`;
    }
    return { answer: `${answer} (Modo demo: con el servidor responde la IA.)`, results };
  },
  async deleteAccount() {},
};
