# Floppy — documento de decisiones

> Estado: **versión 1 en desarrollo**. La app está completa con un modo demo que funciona sin servidor. La base de datos y los tres flujos de n8n están escritos y probados con pruebas automáticas, pero todavía no se probaron contra Supabase y Gemini reales. Este documento reúne las decisiones de producto y de arquitectura y se actualiza a medida que el proyecto avanza.

## 1. Qué es

Floppy es una app Android para **guardar todo lo que hoy queda desordenado en el celular**: lo que hay que hacer, lo que se gastó y lo que interesa recordar.

Tiene **una sola puerta de entrada**: hablar, sacar una foto, escribir o compartir desde otra app. La persona no elige dónde va cada cosa: la IA entiende qué es y lo manda a su sección.

- **Agenda:** tareas con fecha, en un calendario.
- **Gastos:** una planilla por mes y por categoría, que se llena desde tickets y notas de voz.
- **Guardados:** notas, enlaces y fotos con resumen y etiquetas automáticas.
- **Buscador:** encuentra por significado ("la receta de pan que vi la semana pasada") y responde preguntas ("¿cuánto gasté en la farmacia?").

El nombre viene del disquete, el ícono universal de "guardar". La flor le saca lo técnico y lo vuelve cálido.

### Objetivo

Es una app para publicar en Google Play y, a la vez, un proyecto de portfolio que muestra:

- **automatización con n8n** como backend real, no como demo;
- **IA generativa multimodal:** audio, imágenes y texto convertidos en datos estructurados validados contra un esquema;
- **RAG:** búsqueda semántica con embeddings en Postgres y una respuesta generada solo a partir de lo encontrado;
- **producto:** una idea llevada de la necesidad al prototipo y a la app publicada;
- **calidad:** TypeScript estricto, pruebas de los flujos, i18n, tema claro y oscuro, seguridad por fila.

## 2. Decisiones

| # | Decisión | Por qué |
|---|----------|---------|
| 1 | **Una sola entrada para todo** | Es la idea del producto: guardar sin ordenar. Un mismo audio puede dejar una tarea y un gasto a la vez. |
| 2 | **n8n como backend** | Orquesta la IA, la base y las tareas programadas con flujos visibles y fáciles de cambiar. Es además una de las habilidades que el proyecto busca mostrar. |
| 3 | **Supabase (Postgres)** | SQL real, seguridad por fila, autenticación, almacenamiento de fotos y pgvector en un solo servicio con plan gratis. |
| 4 | **Gemini** | Entiende audio, imágenes y texto en una sola llamada y devuelve JSON con esquema. Usa la clave de ImagoStack que no estaba en uso. |
| 5 | **La app lee y edita directo; n8n crea** | Leer, tildar o borrar no necesita IA: va directo a Supabase con la sesión de la persona y la seguridad por fila. Crear sí la necesita: pasa por n8n. Así la app es rápida y n8n hace solo lo que le toca. |
| 6 | **Una persona por cuenta en la v1** | Compartir espacios (pareja, familia) complica permisos y pantallas. Cada dato ya se guarda con su dueño, así que sumarlo después es agregar una pieza, no rehacer. |
| 7 | **Ingreso con código por correo** | Funciona igual en el teléfono y en la web, sin configurar enlaces profundos. Google se suma después. |
| 8 | **Modo demo** | Sin datos de Supabase y n8n, la app arranca con datos de ejemplo y una "IA" simulada. Sirve para revisar la app, para capturas y para mostrarla en una entrevista sin depender del servidor. |
| 9 | **Español, inglés y portugués** | Mismo criterio que las otras apps de ImagoStack. Español neutro, sin voseo. |

## 3. Pantallas

### 3.1 Ingreso
Logo, frase de la app y correo. Supabase manda un código de 6 dígitos y se entra con él. En modo demo hay un solo botón: "Probar con datos de ejemplo".

### 3.2 Inicio
- Saludo y buscador.
- **La entrada:** cuatro botones, con Hablar en el centro y más grande. Mientras graba muestra el tiempo y un botón para terminar; mientras la IA trabaja, "Entendiendo…".
- Accesos a Gastos (lo gastado en el mes) y a Guardados (cuántos hay).
- Las tareas para hoy y las atrasadas, que se tildan con un toque.
- Lo último guardado.

Después de cada carga se abre una hoja con **lo que entendió**: las tareas con su fecha, los gastos con su monto y los guardados, más la transcripción del audio.

### 3.3 Agenda
Calendario del mes con un punto en los días con tareas pendientes. Al tocar un día se ven sus tareas. Debajo, las atrasadas y las que no tienen fecha. Cada tarea muestra de dónde vino (voz, foto o texto).

### 3.4 Gastos
Mes a mes: el total, la distribución por categoría con barras y los movimientos agrupados por día, con los ítems del ticket cuando los hay.

### 3.5 Guardados
Filtros por tipo (notas, enlaces, fotos) y por etiqueta. Cada tarjeta tiene título, resumen, etiquetas y la foto si la hay. Un enlace se abre en el navegador de la app.

### 3.6 Buscar
Una pregunta en lenguaje natural. Arriba, la respuesta de la IA; abajo, lo que encontró, con acceso a su sección.

### 3.7 Escribir y Enlace
Texto libre, o un enlace con un comentario opcional. Es también donde cae lo que se comparte desde otra app.

### 3.8 Ajustes
Idioma, tema, cerrar sesión, **eliminar la cuenta** (Google Play lo exige) y política de privacidad.

## 4. Datos

Tres tablas en Postgres, cada fila con su `user_id` y su `embedding` de 768 dimensiones:

| Tabla | Qué guarda |
|---|---|
| `tasks` | título, fecha, notas, hecha, origen |
| `expenses` | comercio, monto, moneda, categoría, fecha, ítems (JSON), foto del ticket, origen |
| `saved` | tipo (nota, enlace o foto), título, resumen, contenido, URL, foto, etiquetas, origen |

- **Seguridad por fila:** una política por tabla deja ver y tocar solo las filas propias.
- **Fotos:** bucket privado `photos`, una carpeta por persona; se muestran con URLs firmadas de una hora.
- **Vista `expenses_by_month`:** totales por mes y categoría.
- **Categorías de gasto fijas** (Supermercado, Comida, Transporte, Hogar, Servicios, Salud, Mascotas, Ropa, Ocio, Otros): así los totales del mes siempre suman bien.

## 5. Arquitectura

```
 Teléfono (Expo)                         n8n                              Supabase
 ─────────────────                       ───────────────────────          ──────────────────────
 Hablar / Foto / Escribir / Compartir
   │  audio, imagen, texto o enlace
   │  + sesión (JWT)
   └────────────── POST /webhook/floppy ─► valida la sesión ───────────► Auth: ¿de quién es?
                                          lee la página (si es enlace)
                                          Gemini: tareas, gastos, guardados
                                          Gemini: embeddings
                                          guarda todo en una consulta ────► Postgres + pgvector
   ◄─────────────── lo que entendió ──────┘

 Buscar ───────────── POST /webhook/floppy-buscar ─► embedding de la pregunta
                                                    búsqueda por vector ──► Postgres
                                                    Gemini responde con lo encontrado
 Agenda, Gastos, Guardados ───────────── lectura y edición directa ──────► Postgres (seguridad por fila)
 Fotos ───────────────────────────────── subida directa ─────────────────► Storage (carpeta propia)
```

### 5.1 En el teléfono
- **Expo SDK 58 + Expo Router + TypeScript estricto.**
- `src/lib/backend.ts`: una interfaz `Backend` con dos implementaciones de la misma forma, la real y la demo (`src/lib/demo.ts`).
- Estado con zustand: sesión, datos y ajustes (los ajustes se guardan en el teléfono).
- Grabación con `expo-audio`, cámara con `expo-image-picker`; las fotos se achican a 1280 px antes de enviarlas.
- Compartir desde otras apps con `expo-share-intent`: un enlace o un texto abren Escribir ya completo; una imagen se procesa directo.

### 5.2 Flujos de n8n

| Flujo | Ruta | Nodos | Qué hace |
|---|---|---|---|
| Entrada | `/webhook/floppy` | 16 | Valida la sesión, lee la página si es un enlace, Gemini entiende, embeddings, guarda en las tres tablas en una sola consulta y responde. |
| Buscar | `/webhook/floppy-buscar` | 12 | Embedding de la pregunta, búsqueda por similitud en las tres tablas, respuesta de Gemini solo con lo encontrado (RAG). |
| Eliminar la cuenta | `/webhook/floppy-cuenta` | 13 | Borra las fotos de la persona y su usuario; sus filas se borran solas (`on delete cascade`). |

Detalles:
- **La sesión la valida Supabase:** n8n le pregunta a `/auth/v1/user` de quién es el token. El `user_id` nunca viene del pedido.
- **Salida con esquema:** Gemini responde con `responseSchema`; después un nodo Code limpia fechas, montos y categorías antes de guardar.
- **Una sola consulta:** el guardado usa tres `insert` encadenados con `json_to_recordset`, así que se guarda todo o nada.
- **El código de cada nodo Code vive en `n8n/src/*.js`** y `n8n/build.py` lo empaqueta en los JSON que se importan. Así se lee y se versiona como código.
- **Credenciales en n8n, nunca en el código:** "Gemini" (Header Auth, `x-goog-api-key`), "Supabase" (Postgres) y "Supabase servicio" (Custom Auth con la clave de servicio, solo para eliminar cuentas).

### 5.3 Pruebas
`npm run test:flujos` ejecuta el código de cada nodo tal cual está en los JSON, simula Supabase Auth y Gemini, y corre las consultas reales contra un Postgres con pgvector (PGlite) cargado con `supabase/schema.sql`. Cubre: texto con tarea, gasto y nota; enlace; foto de ticket; búsqueda por vector; y eliminación de la cuenta.

## 6. Inteligencia artificial

| Uso | Modelo | Entrada → salida |
|---|---|---|
| Entender lo que se carga | `gemini-flash-latest` | audio, imagen o texto → JSON con tareas, gastos y guardados |
| Embeddings | `gemini-embedding-001` (768 dimensiones) | cada tarea, gasto y guardado → vector |
| Responder búsquedas | `gemini-flash-latest` | pregunta + lo encontrado → una o dos frases |

- El prompt da la fecha de hoy y la zona horaria, para convertir "mañana" o "el jueves" en fechas.
- Reglas explícitas: un ticket es un gasto, un enlace siempre deja un guardado, no inventar.
- La respuesta del buscador usa **solo** lo encontrado; si no alcanza, lo dice.
- El audio no se guarda: se manda a Gemini y se descarta.

## 7. Estructura del repo

```
floppy/
├── apps/mobile/           la app (Expo)
│   └── src/
│       ├── app/           pantallas (Expo Router)
│       ├── components/    piezas visuales, entrada, compartir
│       ├── i18n/          es, en, pt
│       ├── lib/           backend real y demo, Supabase, tipos, tema, fechas
│       └── state/         sesión, datos y ajustes
├── n8n/
│   ├── src/               código de los nodos Code
│   ├── build.py           arma los JSON
│   ├── floppy-*.json      flujos para importar
│   └── test/              pruebas de los flujos
├── supabase/schema.sql    tablas, seguridad, fotos, pgvector
├── assets/brand/          logo y símbolo (SVG y PNG)
└── docs/                  este documento y la puesta en marcha
```

## 8. Costos

Todo en planes gratis mientras la app tenga pocos usuarios:
- **Supabase:** plan gratis (base de 500 MB, 1 GB de fotos).
- **Gemini:** nivel gratis de la API, con límites por minuto y por día.
- **n8n:** autoalojado. Para desarrollar alcanza con la compu; para la app publicada necesita un servidor encendido todo el día (ver Pendientes).

## 9. Google Play

- Permisos: micrófono y cámara, pedidos solo al usarlos.
- Eliminar la cuenta desde la app (Ajustes) y política de privacidad en imagostack.com.
- Seguridad de los datos: correo, contenido que carga la persona, audio e imágenes enviados a Google Gemini para procesarlos. Sin anuncios ni compras.

## 10. Plan de trabajo

1. ~~Base de datos y flujos de n8n con pruebas.~~
2. ~~App completa con modo demo.~~
3. Conectar con Supabase y n8n reales y probar de punta a punta (ver `docs/puesta-en-marcha.md`).
4. Resúmenes programados: las tareas del día a la mañana y el cierre del mes, con notificaciones.
5. Informe mensual en Python.
6. Capturas reales, ficha de Google Play y publicación.

## 11. Pendientes

- **Dónde dejar n8n funcionando** para la app publicada (un servidor gratis o barato, siempre encendido).
- **Ingreso con Google.**
- **Notificaciones** para los resúmenes programados.
- **Editar** una tarea, un gasto o un guardado (hoy se tildan y se borran).
- **Espacios compartidos** para varias personas.

## 12. Alternativas descartadas

- **Elegir el tipo antes de cargar** ("nueva tarea", "nuevo gasto"): es lo que hacen todas las apps y es justo lo que Floppy evita.
- **Tres secciones separadas para notas, enlaces y fotos:** se unificaron en Guardados con filtros; es más simple de recorrer.
- **Que la app hable directo con Gemini:** la clave quedaría en el teléfono. Pasa siempre por n8n.
- **Firebase:** sin SQL ni búsqueda por vectores integrada.
