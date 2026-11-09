<p align="center"><img src="assets/brand/logo-icono.svg" width="96" alt="Floppy"></p>

# Floppy

Habla, saca una foto o comparte: Floppy lo guarda y lo ordena solo.

Una app Android de [ImagoStack](https://imagostack.com) con una sola puerta de entrada (voz, foto,
texto o compartir desde otra app) y tres secciones: **Agenda**, **Gastos** y **Guardados**, más un
buscador que encuentra por significado. La IA decide qué es cada cosa y dónde va.

| Pieza | Tecnología |
|---|---|
| App | React Native · Expo SDK 58 · Expo Router · TypeScript |
| Backend | n8n (entrada, búsqueda, eliminar la cuenta) |
| IA | Google Gemini: audio, imágenes y texto a JSON con esquema; embeddings |
| Datos | Supabase: Postgres con seguridad por fila, pgvector, Auth y Storage |

## Probarla

```bash
npm install
npm run mobile        # sin .env arranca en modo demo, con datos de ejemplo
npm run test:flujos   # pruebas de los flujos de n8n contra Postgres + pgvector
```

## Documentación

- [`docs/arquitectura.md`](docs/arquitectura.md): decisiones de producto y de arquitectura.
- [`docs/puesta-en-marcha.md`](docs/puesta-en-marcha.md): conectar Supabase, n8n y la app.

## Marca

Verde `#1F957D` · crema `#F5F2EB`. El símbolo es un disquete, el ícono universal de guardar, con una flor.
