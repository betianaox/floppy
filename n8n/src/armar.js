// Arma el pedido a Gemini: un audio, una foto, un texto o un enlace ya leído.
const p = $json;
const { model } = $('Configuración').item.json.config;

const instrucciones = `Eres el asistente de Floppy, una app que convierte lo que la persona dice, fotografía o comparte en TAREAS, GASTOS y GUARDADOS.
Hoy es ${p.today} (zona horaria ${p.tz}). Moneda por defecto: pesos argentinos (ARS).

Qué va en cada lista:
- tasks: algo que la persona tiene que hacer. Título corto en infinitivo ("Llamar al contador"). Si menciona un día ("mañana", "el jueves", "el 15"), due_date en AAAA-MM-DD; si no, null.
- expenses: plata que ya se gastó. amount es un número sin símbolos ni separadores de miles. category es una de: Supermercado, Comida, Transporte, Hogar, Servicios, Salud, Mascotas, Ropa, Ocio, Otros.
- saved: algo para recordar o volver a ver que no es una tarea ni un gasto: una idea, una receta, un dato, un lugar, un enlace, una foto que interesa.
  kind es "note" (texto o audio), "link" (enlace) o "photo" (imagen que no es un ticket).
  title corto y claro; summary de una o dos frases; tags: entre 1 y 4 etiquetas en minúscula ("receta", "viaje", "trabajo").

Reglas:
- Una misma entrada puede dejar cosas en varias listas ("mañana llamar al contador y gasté 12000 en el súper" = 1 tarea + 1 gasto).
- La foto de un ticket o factura es UN gasto con el comercio, el total, la fecha del ticket y los ítems que se lean. No es un guardado.
- La foto de un papel con anotaciones son tareas o notas, según lo que diga.
- Un enlace siempre deja un guardado kind "link", resumiendo de qué trata la página.
- No inventes nada que no esté. Si una lista no tiene nada, devuélvela vacía.
- transcript: lo que dijo la persona (audio) o lo que se lee (imagen), resumido si es largo.
- summary: una frase corta, en español, de lo que hiciste ("Agendé 1 tarea y anoté 1 gasto").`;

const parts = [{ text: instrucciones }];
if (p.kind === 'text') {
  parts.push({ text: `Texto de la persona: ${p.text}` });
} else if (p.kind === 'link') {
  const pg = p.page ?? {};
  parts.push({
    text: `Enlace compartido: ${p.url}\nComentario de la persona: ${p.text || '(ninguno)'}\n` +
      (pg.ok ? `Título: ${pg.title}\nDescripción: ${pg.description}\nTexto de la página: ${pg.text}` : 'No se pudo leer la página: resume a partir del enlace.'),
  });
} else {
  if (!p.data || !p.mimeType) throw new Error('Faltan data (base64) o mimeType');
  parts.push({ inline_data: { mime_type: p.mimeType, data: p.data } });
  if (p.text) parts.push({ text: `Comentario de la persona: ${p.text}` });
}

const S = (extra = {}) => ({ type: 'STRING', ...extra });
const schema = {
  type: 'OBJECT',
  properties: {
    transcript: S(),
    summary: S(),
    tasks: { type: 'ARRAY', items: { type: 'OBJECT', properties: { title: S(), due_date: S({ nullable: true }), notes: S({ nullable: true }) }, required: ['title'] } },
    expenses: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          merchant: S({ nullable: true }), amount: { type: 'NUMBER' }, currency: S(), category: S(), spent_on: S({ nullable: true }),
          items: { type: 'ARRAY', nullable: true, items: { type: 'OBJECT', properties: { name: S(), amount: { type: 'NUMBER', nullable: true } } } },
        },
        required: ['amount', 'category'],
      },
    },
    saved: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { kind: S({ enum: ['note', 'link', 'photo'] }), title: S(), summary: S({ nullable: true }), content: S({ nullable: true }), tags: { type: 'ARRAY', items: S() } },
        required: ['kind', 'title'],
      },
    },
  },
  required: ['transcript', 'summary', 'tasks', 'expenses', 'saved'],
};

return {
  json: {
    model,
    request: { contents: [{ role: 'user', parts }], generationConfig: { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.2 } },
  },
};
