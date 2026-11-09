// Le pone a cada tarea, gasto y guardado su vector, en el mismo orden en que se pidieron.
const d = $('Leer respuesta').item.json;
const vecs = ($json.embeddings ?? []).map((e) => `[${e.values.join(',')}]`);
let i = 0;
const con = (lista) => lista.map((x) => ({ ...x, embedding: vecs[i++] ?? null }));
return {
  json: {
    user_id: d.user_id,
    source: d.source,
    transcript: d.transcript,
    summary: d.summary,
    tasks: con(d.tasks),
    expenses: con(d.expenses),
    saved: con(d.saved),
  },
};
