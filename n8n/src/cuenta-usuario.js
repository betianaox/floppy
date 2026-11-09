// La persona a borrar es la dueña de la sesión: nunca un id que venga en el pedido.
const user = $json.body ? JSON.parse($json.body) : {};
if (!user.id) throw new Error('Sesión sin usuario');
if ($('Entrada desde la app').item.json.body?.confirm !== true) throw new Error('Falta confirm: true');
return { json: { user_id: user.id } };
