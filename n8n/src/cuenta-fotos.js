// Arma la lista de fotos de la persona para borrarlas del almacenamiento.
const uid = $('Usuario').item.json.user_id;
const lista = Array.isArray($json.body) ? $json.body : (() => { try { return JSON.parse($json.body ?? '[]'); } catch { return []; } })();
return { json: { user_id: uid, prefixes: lista.filter((f) => f.name).map((f) => `${uid}/${f.name}`) } };
