// Lee la respuesta de Gemini, la limpia y prepara los textos para los embeddings.
// Si era un enlace, el pedido viene de "Extraer de la página"; si no, de "Normalizar".
const p = $('Extraer de la página').isExecuted ? $('Extraer de la página').item.json : $('Normalizar').item.json;
const { embeddingModel } = $('Configuración').item.json.config;
const raw = $json.candidates?.[0]?.content?.parts?.map((x) => x.text ?? '').join('') ?? '';
let d;
try { d = JSON.parse(raw); } catch { throw new Error('Gemini no devolvió un JSON válido: ' + raw.slice(0, 200)); }

const fecha = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const CATS = ['Supermercado', 'Comida', 'Transporte', 'Hogar', 'Servicios', 'Salud', 'Mascotas', 'Ropa', 'Ocio', 'Otros'];

const tasks = (d.tasks ?? []).filter((t) => t.title?.trim())
  .map((t) => ({ title: t.title.trim(), due_date: fecha(t.due_date), notes: t.notes || null }));

const expenses = (d.expenses ?? []).filter((g) => Number.isFinite(Number(g.amount)) && Number(g.amount) >= 0)
  .map((g) => ({
    merchant: g.merchant || null,
    amount: Number(g.amount),
    currency: (g.currency || 'ARS').toUpperCase().slice(0, 3),
    category: CATS.includes(g.category) ? g.category : 'Otros',
    spent_on: fecha(g.spent_on),
    items: g.items?.length ? g.items : null,
    // La foto del ticket queda con el gasto.
    photo_path: p.kind === 'image' ? p.photo_path : null,
  }));

const saved = (d.saved ?? []).filter((s) => s.title?.trim())
  .map((s) => ({
    kind: ['note', 'link', 'photo'].includes(s.kind) ? s.kind : 'note',
    title: s.title.trim(),
    summary: s.summary || null,
    content: s.content || null,
    url: p.kind === 'link' ? p.url : null,
    photo_path: s.kind === 'photo' ? p.photo_path : null,
    tags: (s.tags ?? []).map((t) => String(t).toLowerCase().trim()).filter(Boolean).slice(0, 4),
  }));
// Un enlace siempre queda guardado, aunque el modelo no lo haya puesto.
if (p.kind === 'link' && !saved.some((s) => s.kind === 'link')) {
  saved.push({ kind: 'link', title: p.page?.title || p.url, summary: p.page?.description || null, content: null, url: p.url, photo_path: null, tags: [] });
}

// Texto que representa cada cosa para buscarla después por significado.
const textos = [
  ...tasks.map((t) => `Tarea: ${t.title}. ${t.notes ?? ''} ${t.due_date ?? ''}`),
  ...expenses.map((g) => `Gasto: ${g.merchant ?? ''} ${g.category} ${g.amount} ${g.currency}. ${(g.items ?? []).map((i) => i.name).join(', ')}`),
  ...saved.map((s) => `${s.title}. ${s.summary ?? ''} ${s.tags.join(' ')} ${s.url ?? ''}`),
];
const paraEmbeddings = textos.length ? textos : ['(vacío)'];

return {
  json: {
    user_id: p.user_id,
    source: p.kind,
    transcript: d.transcript ?? '',
    summary: d.summary ?? '',
    tasks,
    expenses,
    saved,
    embeddingRequest: {
      requests: paraEmbeddings.map((text) => ({
        model: `models/${embeddingModel}`,
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_DOCUMENT',
        outputDimensionality: 768,
      })),
    },
  },
};
