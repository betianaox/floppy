// Toma la pregunta y arma el pedido de embedding para buscar por significado.
const req = $('Entrada desde la app').item.json;
const user = $json.body ? JSON.parse($json.body) : {};
const q = String(req.body?.q ?? '').trim();
if (!q) throw new Error('Falta q: lo que se busca');
const { embeddingModel } = $('Configuración').item.json.config;
return {
  json: {
    user_id: user.id,
    q,
    embeddingModel,
    request: {
      model: `models/${embeddingModel}`,
      content: { parts: [{ text: q }] },
      taskType: 'RETRIEVAL_QUERY',
      outputDimensionality: 768,
    },
  },
};
