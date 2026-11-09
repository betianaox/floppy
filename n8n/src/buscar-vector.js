// Deja el vector de la pregunta como texto que Postgres entiende: [0.1,0.2,...]
const p = $('Pregunta').item.json;
return { json: { user_id: p.user_id, q: p.q, vector: `[${$json.embedding.values.join(',')}]` } };
