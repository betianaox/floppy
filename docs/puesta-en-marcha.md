# Floppy — puesta en marcha

Pasos para pasar del modo demo a la app conectada de verdad. Se hacen una sola vez.

## 1. Supabase

1. En [supabase.com](https://supabase.com), crea un proyecto nuevo (plan gratis). Guarda la contraseña de la base: la vas a usar en n8n.
2. **SQL Editor → New query:** pega el contenido de `supabase/schema.sql` y ejecútalo. Crea las tablas, la seguridad por fila, el bucket de fotos y activa pgvector.
3. **Authentication → Sign In / Providers → Email:** déjalo activado.
4. **Authentication → Emails → Magic Link:** para que llegue un código de 6 dígitos en vez de un enlace, el texto del correo tiene que incluir `{{ .Token }}`. Por ejemplo: `Tu código para entrar a Floppy es {{ .Token }}`.
5. **Project Settings → API:** copia la **Project URL**, la **anon key** (pública) y la **service_role key** (secreta: solo va en n8n).
6. **Connect → Session pooler:** copia host, puerto, base y usuario para la credencial de Postgres en n8n.

## 2. n8n

Con n8n abierto (`npx n8n` y después `http://localhost:5678`):

1. **Importar los flujos:** menú → *Import from File* → `n8n/floppy-entrada.json`. Repite con `floppy-buscar.json` y `floppy-cuenta.json`.
2. **Crear las credenciales** (*Credentials → Add credential*):
   - **Gemini** — tipo *Header Auth*. Name: `x-goog-api-key`. Value: la clave `GEMINI_API_KEY` del archivo `.env.local` del sitio de ImagoStack.
   - **Supabase** — tipo *Postgres*. Host, base, usuario y contraseña del Session pooler; puerto 5432; SSL: *require*.
   - **Supabase servicio** — tipo *Custom Auth*, con este JSON (reemplazando la clave):
     ```json
     { "headers": { "apikey": "SERVICE_ROLE_KEY", "Authorization": "Bearer SERVICE_ROLE_KEY" } }
     ```
3. **En cada flujo:**
   - abre el nodo **Configuración** y completa `supabaseUrl` y `supabaseAnonKey`;
   - en los nodos HTTP de Gemini (Gemini, Embeddings, Embedding de la pregunta) elige la credencial **Gemini**;
   - en los nodos Postgres, **Supabase**; en los de "Eliminar la cuenta" que llaman a Supabase, **Supabase servicio**.
4. **Activar** los tres flujos (interruptor arriba a la derecha).

### Probar sin la app

Necesitas un token de sesión. La forma más simple: entra a la app ya conectada (paso 3) y copia el token desde el registro, o pide un código por correo y verifícalo con la API de Supabase. Con el token:

```bash
curl -X POST http://localhost:5678/webhook/floppy \
  -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"kind":"text","text":"mañana llamar al contador y gasté 12000 en el súper"}'
```

Sin token responde `401 Sesión inválida o vencida`: eso también es una prueba de que la seguridad funciona.

## 3. La app

1. En `apps/mobile`, copia `.env.example` a `.env` y completa:
   - `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`;
   - `EXPO_PUBLIC_N8N_URL`: la IP de tu compu en tu red, por ejemplo `http://192.168.0.10:5678` (el teléfono y la compu tienen que estar en el mismo wifi).
2. Desde la raíz del repo: `npm install` y después `npm run mobile`.
3. Compartir desde otras apps, el micrófono y la cámara necesitan una **build de desarrollo** (no funcionan en Expo Go): `npx eas build --profile preview --platform android` dentro de `apps/mobile`.

Sin el `.env`, la app arranca en **modo demo**: datos de ejemplo y la etiqueta "Demo".

## 4. Pruebas

```bash
npm run test:flujos   # los tres flujos de n8n contra un Postgres con pgvector
npm run typecheck     # la app
```

Si cambias el código de un nodo en `n8n/src/`, ejecuta `npm run flujos` para regenerar los JSON y vuelve a importarlos.
