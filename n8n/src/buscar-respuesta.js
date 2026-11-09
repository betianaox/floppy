// Con lo encontrado, le pide a Gemini una respuesta corta, solo a partir de eso (RAG).
const { model } = $('Configuración').item.json.config;
const q = $('Pregunta').item.json.q;
const hoy = $now.setZone('America/Argentina/Buenos_Aires').toISODate();
const encontrados = $input.all().map((it) => it.json).filter((r) => r.type);
const contexto = encontrados
  .map((r, i) => `[${i + 1}] (${r.type}) ${r.title} — ${r.detail} — ${r.date ?? ''}`)
  .join('\n');
const prompt = `Eres el buscador de Floppy. Hoy es ${hoy}.
La persona pregunta: "${q}"
Estas son sus cosas guardadas que más se parecen a la pregunta (tareas, gastos y guardados):
${contexto || '(no hay nada guardado que se parezca)'}

Responde en español, en una o dos frases, usando SOLO esa información. Si suman montos, haz la cuenta.
Si no alcanza para responder, dilo con honestidad. No inventes.`;
return [{
  json: {
    model,
    results: encontrados,
    request: { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2 } },
  },
}];
