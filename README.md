# Floppy

Habla, saca una foto o comparte: Floppy lo guarda y lo ordena solo.

Una app de ImagoStack con una sola entrada (voz, foto, texto o compartir desde
otra app) y tres secciones: **Agenda** (tareas), **Gastos** y **Guardados**
(notas, enlaces y fotos). La IA decide qué es cada cosa y dónde va.

## Piezas

| Carpeta | Qué hay |
|---|---|
| `n8n/` | Flujos para importar en n8n. `floppy-entrada.json`: webhook, Gemini, Supabase y respuesta a la app. |
| `supabase/` | `schema.sql`: tablas de tareas y gastos. |
| `assets/brand/` | Logo: símbolo y texto en SVG y PNG, ícono de la app. |

## Marca

- Verde `#1F957D` · crema `#F5F2EB`.
- El símbolo es un disquete (el ícono universal de guardar) con una flor.
