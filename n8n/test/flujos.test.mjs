// Prueba los flujos de n8n sin n8n: ejecuta el código de cada nodo Code tal
// cual está en el JSON, simula las respuestas de Supabase Auth y de Gemini, y
// corre las consultas SQL de los nodos Postgres contra un Postgres real con
// pgvector (PGlite), cargado con supabase/schema.sql.
//
//   npm run test:flujos

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';

const raiz = new URL('../../', import.meta.url);
const leer = (p) => readFileSync(new URL(p, raiz), 'utf8');
const entrada = JSON.parse(leer('n8n/floppy-entrada.json'));
const buscar = JSON.parse(leer('n8n/floppy-buscar.json'));
const nodo = (wf, name) => wf.nodes.find((n) => n.name === name);

const USER = '11111111-1111-1111-1111-111111111111';
const $now = { setZone: () => ({ toISODate: () => '2026-11-09' }) };

/** Ejecuta un nodo Code con los nodos anteriores ya resueltos. */
function correr(wf, name, json, previos, input = [{ json }]) {
  const $ = (n) => {
    if (!(n in previos)) return { isExecuted: false, item: { json: undefined } };
    return { isExecuted: true, item: { json: previos[n] } };
  };
  const $input = { all: () => input };
  const out = new Function('$json', '$', '$now', '$input', nodo(wf, name).parameters.jsCode)(json, $, $now, $input);
  return Array.isArray(out) ? out[0].json : out.json;
}

/** Resuelve "Query Parameters" como n8n 2.5+: cada {{ }} es un valor; un JSON va entero. */
function parametros(expr, $json) {
  const valores = [];
  for (const [, cuerpo] of expr.matchAll(/\{\{([\s\S]*?)\}\}/g)) {
    const v = new Function('$json', `return (${cuerpo});`)($json);
    let esJson = false;
    try { JSON.parse(v); esJson = typeof v === 'string' && /^[\[{]/.test(v); } catch {}
    valores.push(...(esJson ? [v] : String(v).split(',')));
  }
  return valores;
}

/** Vector de 768 dimensiones determinístico a partir de un texto. */
function vec(texto) {
  let h = 2166136261;
  return Array.from({ length: 768 }, (_, i) => {
    h = Math.imul(h ^ (texto.charCodeAt(i % texto.length) + i), 16777619);
    return ((h >>> 0) % 1000) / 1000 - 0.5;
  });
}

async function base() {
  const db = new PGlite({ extensions: { vector } });
  await db.exec(`
    create role authenticated;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create schema storage; create table storage.buckets(id text primary key, name text, public boolean);
    create table storage.objects(id serial, bucket_id text, name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
  `);
  await db.exec(leer('supabase/schema.sql'));
  await db.query(`insert into auth.users values ($1)`, [USER]);
  return db;
}

const configuracion = (wf, json) => correr(wf, 'Configuración', json, {});
const sesionOk = { statusCode: 200, body: JSON.stringify({ id: USER, email: 'demo@floppy.app' }) };

async function procesarEntrada(db, body, respuestaGemini, pagina) {
  const req = { headers: { authorization: 'Bearer x' }, body };
  const prev = { 'Entrada desde la app': req };
  prev['Configuración'] = configuracion(entrada, req);
  prev['Normalizar'] = correr(entrada, 'Normalizar', sesionOk, prev);
  let alArmar = prev['Normalizar'];
  if (body.kind === 'link') {
    prev['Extraer de la página'] = correr(entrada, 'Extraer de la página', pagina, prev);
    alArmar = prev['Extraer de la página'];
  }
  prev['Armar pedido a Gemini'] = correr(entrada, 'Armar pedido a Gemini', alArmar, prev);
  const gemini = { candidates: [{ content: { parts: [{ text: JSON.stringify(respuestaGemini) }] } }] };
  prev['Leer respuesta'] = correr(entrada, 'Leer respuesta', gemini, prev);
  const pedidos = prev['Leer respuesta'].embeddingRequest.requests;
  const embeddings = { embeddings: pedidos.map((r) => ({ values: vec(r.content.parts[0].text) })) };
  prev['Unir embeddings'] = correr(entrada, 'Unir embeddings', embeddings, prev);
  const g = nodo(entrada, 'Guardar en Supabase').parameters;
  const { rows } = await db.query(g.query, parametros(g.options.queryReplacement, prev['Unir embeddings']));
  return { prev, guardado: rows[0] };
}

test('un texto con tarea, gasto y nota se guarda en las tres tablas', async () => {
  const db = await base();
  const { prev, guardado } = await procesarEntrada(
    db,
    { kind: 'text', text: 'mañana llamar al contador, gasté 12000 en el súper y la idea de pintar el living de verde' },
    {
      transcript: '…',
      summary: 'Agendé 1 tarea, anoté 1 gasto y guardé 1 nota',
      tasks: [{ title: 'Llamar al contador', due_date: '2026-11-10', notes: null }],
      expenses: [{ merchant: null, amount: 12000, currency: 'ars', category: 'Supermercado', spent_on: null }],
      saved: [{ kind: 'note', title: 'Pintar el living de verde', summary: 'Idea para la casa', tags: ['Casa', 'ideas'] }],
    },
  );
  assert.equal(prev['Armar pedido a Gemini'].request.contents[0].parts.length, 2);
  assert.deepEqual(guardado, { tasks: 1, expenses: 1, saved: 1 });

  const t = (await db.query(`select title, due_date::text, source, user_id::text, vector_dims(embedding) d from tasks`)).rows[0];
  assert.deepEqual(t, { title: 'Llamar al contador', due_date: '2026-11-10', source: 'text', user_id: USER, d: 768 });
  const e = (await db.query(`select amount::float, currency, spent_on = current_date hoy from expenses`)).rows[0];
  assert.deepEqual(e, { amount: 12000, currency: 'ARS', hoy: true });
  const s = (await db.query(`select kind, tags from saved`)).rows[0];
  assert.deepEqual(s, { kind: 'note', tags: ['casa', 'ideas'] });
});

test('un enlace lee la página y siempre deja un guardado con la URL', async () => {
  const db = await base();
  const html = `<html><head><title>Pan casero</title><meta property="og:description" content="Receta fácil de pan"></head>
    <body><script>x()</script><p>Harina, agua y sal.</p></body></html>`;
  const { prev, guardado } = await procesarEntrada(
    db,
    { kind: 'link', url: 'https://ejemplo.com/pan' },
    { transcript: '', summary: 'Guardé la receta', tasks: [], expenses: [], saved: [] },
    { statusCode: 200, body: html },
  );
  assert.equal(prev['Extraer de la página'].page.title, 'Pan casero');
  assert.match(prev['Extraer de la página'].page.text, /Harina, agua y sal/);
  assert.doesNotMatch(prev['Extraer de la página'].page.text, /x\(\)/);
  assert.deepEqual(guardado, { tasks: 0, expenses: 0, saved: 1 });
  const s = (await db.query(`select kind, title, url, source from saved`)).rows[0];
  assert.deepEqual(s, { kind: 'link', title: 'Pan casero', url: 'https://ejemplo.com/pan', source: 'link' });
});

test('la foto de un ticket guarda el gasto con su foto', async () => {
  const db = await base();
  const { guardado } = await procesarEntrada(
    db,
    { kind: 'image', data: 'AAAA', mimeType: 'image/jpeg', photoPath: `${USER}/t1.jpg` },
    {
      transcript: 'Ticket de farmacia', summary: 'Anoté 1 gasto', tasks: [], saved: [],
      expenses: [{ merchant: 'Farmacia Central', amount: 8450.5, currency: 'ARS', category: 'Salud', spent_on: '2026-11-08', items: [{ name: 'Ibuprofeno', amount: 3200 }] }],
    },
  );
  assert.deepEqual(guardado, { tasks: 0, expenses: 1, saved: 0 });
  const e = (await db.query(`select merchant, amount::float, spent_on::text, photo_path, items from expenses`)).rows[0];
  assert.equal(e.photo_path, `${USER}/t1.jpg`);
  assert.equal(e.spent_on, '2026-11-08');
  assert.equal(e.items[0].name, 'Ibuprofeno');
});

test('la búsqueda encuentra por vector y arma el contexto para la respuesta', async () => {
  const db = await base();
  await procesarEntrada(
    db,
    { kind: 'text', text: '…' },
    {
      transcript: '', summary: '',
      tasks: [{ title: 'Llamar al contador', due_date: null }],
      expenses: [],
      saved: [{ kind: 'note', title: 'Receta de pan', summary: 'Harina, agua y sal', tags: ['receta'] }],
    },
  );
  const req = { headers: { authorization: 'Bearer x' }, body: { q: 'la receta de pan' } };
  const prev = { 'Entrada desde la app': req };
  prev['Configuración'] = configuracion(buscar, req);
  prev['Pregunta'] = correr(buscar, 'Pregunta', sesionOk, prev);
  assert.equal(prev['Pregunta'].request.taskType, 'RETRIEVAL_QUERY');
  // El vector de la pregunta es igual al de la nota: tiene que salir primera.
  const v = vec('Receta de pan. Harina, agua y sal receta ');
  prev['Vector'] = correr(buscar, 'Vector', { embedding: { values: v } }, prev);
  const b = nodo(buscar, 'Buscar en Supabase').parameters;
  const { rows } = await db.query(b.query, parametros(b.options.queryReplacement, prev['Vector']));
  assert.equal(rows[0].type, 'saved');
  assert.equal(rows[0].title, 'Receta de pan');
  const r = correr(buscar, 'Armar respuesta', null, prev, rows.map((json) => ({ json })));
  assert.match(r.request.contents[0].parts[0].text, /Receta de pan/);
  assert.equal(r.results[0].title, 'Receta de pan');
});

test('eliminar la cuenta: borra a la dueña de la sesión y arma las rutas de sus fotos', () => {
  const cuenta = JSON.parse(leer('n8n/floppy-cuenta.json'));
  const sinConfirmar = { 'Entrada desde la app': { body: { user_id: 'otra-persona' } } };
  assert.throws(() => correr(cuenta, 'Usuario', sesionOk, sinConfirmar), /confirm/);
  const prev = { 'Entrada desde la app': { body: { confirm: true, user_id: 'otra-persona' } } };
  prev['Usuario'] = correr(cuenta, 'Usuario', sesionOk, prev);
  assert.equal(prev['Usuario'].user_id, USER);
  const fotos = correr(cuenta, 'Rutas de las fotos', { body: JSON.stringify([{ name: 'a.jpg' }, { name: 'b.jpg' }]) }, prev);
  assert.deepEqual(fotos.prefixes, [`${USER}/a.jpg`, `${USER}/b.jpg`]);
});
