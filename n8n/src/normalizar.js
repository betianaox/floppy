// Junta en un solo objeto quién es la persona (validado por Supabase) y qué mandó.
const req = $('Entrada desde la app').item.json;
const body = req.body ?? {};
const user = $json.body ? JSON.parse($json.body) : {};
const kind = body.kind;
if (!['audio', 'image', 'text', 'link'].includes(kind)) {
  throw new Error('kind tiene que ser audio, image, text o link');
}
const tz = body.tz || 'America/Argentina/Buenos_Aires';
return {
  json: {
    user_id: user.id,
    kind,
    text: body.text ?? '',
    url: body.url ?? null,
    data: body.data ?? null,
    mimeType: body.mimeType ?? null,
    photo_path: body.photoPath ?? null,
    tz,
    today: body.today || $now.setZone(tz).toISODate(),
  },
};
