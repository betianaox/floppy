"""Genera los flujos de n8n de Floppy a partir del código en src/.

    python3 n8n/build.py

El código de cada nodo Code vive en src/*.js para poder leerlo y versionarlo
como código; este script lo empaqueta en los JSON que se importan en n8n.
"""
import json
import uuid
from pathlib import Path

HERE = Path(__file__).parent
SRC = HERE / "src"


def nid(seed):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "floppy/" + seed))


def code(name, file, pos, mode="runOnceForEachItem"):
    return {"id": nid(name), "name": name, "type": "n8n-nodes-base.code", "typeVersion": 2, "position": pos,
            "parameters": {"mode": mode, "jsCode": (SRC / file).read_text()}}


def webhook(name, path, pos):
    return {"id": nid(name + path), "name": name, "type": "n8n-nodes-base.webhook", "typeVersion": 2.1, "position": pos,
            "webhookId": nid("webhook/" + path),
            "parameters": {"httpMethod": "POST", "path": path, "responseMode": "responseNode", "options": {}}}


def gemini_http(name, url_expr, body_expr, pos):
    """Llamada a la API de Gemini con la credencial Header Auth "Gemini" (x-goog-api-key)."""
    return {"id": nid(name), "name": name, "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2, "position": pos,
            "parameters": {"method": "POST", "url": url_expr, "authentication": "genericCredentialType",
                           "genericAuthType": "httpHeaderAuth", "sendBody": True, "specifyBody": "json",
                           "jsonBody": body_expr, "options": {"timeout": 60000}}}


def validar_sesion(pos):
    """Le pregunta a Supabase de quién es la sesión que mandó la app."""
    return {"id": nid("validar"), "name": "Validar sesión", "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2,
            "position": pos,
            "parameters": {
                "method": "GET",
                "url": "={{ $json.config.supabaseUrl }}/auth/v1/user",
                "sendHeaders": True,
                "headerParameters": {"parameters": [
                    {"name": "apikey", "value": "={{ $json.config.supabaseAnonKey }}"},
                    {"name": "Authorization", "value": "={{ $json.headers.authorization ?? '' }}"},
                ]},
                "options": {"response": {"response": {"fullResponse": True, "neverError": True, "responseFormat": "text"}}},
            }}


def if_node(name, left, op, right, pos, typ="string"):
    cond = {"id": nid(name + "c"), "leftValue": left, "rightValue": right,
            "operator": {"type": typ, "operation": op}}
    return {"id": nid(name), "name": name, "type": "n8n-nodes-base.if", "typeVersion": 2.2, "position": pos,
            "parameters": {"conditions": {"options": {"caseSensitive": True, "leftValue": "", "typeValidation": "loose", "version": 2},
                                          "conditions": [cond], "combinator": "and"}, "options": {}}}


def respond(name, body_expr, pos, code_=None):
    opts = {"responseCode": code_} if code_ else {}
    return {"id": nid(name), "name": name, "type": "n8n-nodes-base.respondToWebhook", "typeVersion": 1.1, "position": pos,
            "parameters": {"respondWith": "json", "responseBody": body_expr, "options": opts}}


def postgres(name, query, params, pos, always=False):
    n = {"id": nid(name), "name": name, "type": "n8n-nodes-base.postgres", "typeVersion": 2.6, "position": pos,
         "parameters": {"operation": "executeQuery", "query": query, "options": {"queryReplacement": params}}}
    if always:
        n["alwaysOutputData"] = True
    return n


def link(conn, a, b, out=0):
    conn.setdefault(a, {"main": []})
    while len(conn[a]["main"]) <= out:
        conn[a]["main"].append([])
    conn[a]["main"][out].append({"node": b, "type": "main", "index": 0})


NO_AUTORIZADO = respond("Sin sesión", '={{ JSON.stringify({ ok: false, error: "Sesión inválida o vencida" }) }}', None, 401)

# ── Entrada ────────────────────────────────────────────────────────────────
GUARDAR = """with t as (
  insert into tasks (user_id, title, due_date, notes, source, embedding)
  select $4::uuid, title, due_date, notes, $5, embedding::vector
  from json_to_recordset($1::json) as x(title text, due_date date, notes text, embedding text)
  returning id
), e as (
  insert into expenses (user_id, merchant, amount, currency, category, spent_on, items, photo_path, source, embedding)
  select $4::uuid, merchant, amount, currency, category, coalesce(spent_on, current_date), items, photo_path, $5, embedding::vector
  from json_to_recordset($2::json) as x(merchant text, amount numeric, currency text, category text, spent_on date, items jsonb, photo_path text, embedding text)
  returning id
), s as (
  insert into saved (user_id, kind, title, summary, content, url, photo_path, tags, source, embedding)
  select $4::uuid, kind, title, summary, content, url, photo_path, coalesce(tags, '{}'), $5, embedding::vector
  from json_to_recordset($3::json) as x(kind text, title text, summary text, content text, url text, photo_path text, tags text[], embedding text)
  returning id
)
select (select count(*) from t) as tasks, (select count(*) from e) as expenses, (select count(*) from s) as saved;"""

sin_vector = "({ embedding, ...r }) => r"
entrada_nodes = [
    webhook("Entrada desde la app", "floppy", [0, 0]),
    code("Configuración", "config.js", [220, 0]),
    validar_sesion([440, 0]),
    if_node("¿Sesión válida?", "={{ $json.statusCode }}", "equals", 200, [660, 0], "number"),
    {**NO_AUTORIZADO, "position": [880, 200]},
    code("Normalizar", "normalizar.js", [880, -20]),
    if_node("¿Es un enlace?", "={{ $json.kind }}", "equals", "link", [1100, -20]),
    {"id": nid("leer-pagina"), "name": "Leer la página", "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2,
     "position": [1320, -180],
     "parameters": {"method": "GET", "url": "={{ $json.url }}",
                    "options": {"timeout": 15000, "redirect": {"redirect": {"maxRedirects": 5}},
                                "response": {"response": {"fullResponse": True, "neverError": True, "responseFormat": "text"}}}}},
    code("Extraer de la página", "extraer.js", [1540, -180]),
    code("Armar pedido a Gemini", "armar.js", [1760, -20]),
    gemini_http("Gemini", "=https://generativelanguage.googleapis.com/v1beta/models/{{ $json.model }}:generateContent",
                "={{ JSON.stringify($json.request) }}", [1980, -20]),
    code("Leer respuesta", "leer.js", [2200, -20]),
    gemini_http("Embeddings", "=https://generativelanguage.googleapis.com/v1beta/models/{{ $('Configuración').item.json.config.embeddingModel }}:batchEmbedContents",
                "={{ JSON.stringify($json.embeddingRequest) }}", [2420, -20]),
    code("Unir embeddings", "unir.js", [2640, -20]),
    postgres("Guardar en Supabase", GUARDAR,
             "={{ JSON.stringify($json.tasks) }},{{ JSON.stringify($json.expenses) }},{{ JSON.stringify($json.saved) }},{{ $json.user_id }},{{ $json.source }}",
             [2860, -20]),
    respond("Responder a la app",
            "={{ JSON.stringify({ ok: true, summary: $('Unir embeddings').item.json.summary, transcript: $('Unir embeddings').item.json.transcript, "
            f"tasks: $('Unir embeddings').item.json.tasks.map({sin_vector}), expenses: $('Unir embeddings').item.json.expenses.map({sin_vector}), "
            f"saved: $('Unir embeddings').item.json.saved.map({sin_vector}) }}) }}}}",
            [3080, -20]),
]
ec = {}
for a, b in [("Entrada desde la app", "Configuración"), ("Configuración", "Validar sesión"), ("Validar sesión", "¿Sesión válida?")]:
    link(ec, a, b)
link(ec, "¿Sesión válida?", "Normalizar", 0)
link(ec, "¿Sesión válida?", "Sin sesión", 1)
link(ec, "Normalizar", "¿Es un enlace?")
link(ec, "¿Es un enlace?", "Leer la página", 0)
link(ec, "¿Es un enlace?", "Armar pedido a Gemini", 1)
link(ec, "Leer la página", "Extraer de la página")
link(ec, "Extraer de la página", "Armar pedido a Gemini")
for a, b in [("Armar pedido a Gemini", "Gemini"), ("Gemini", "Leer respuesta"), ("Leer respuesta", "Embeddings"),
             ("Embeddings", "Unir embeddings"), ("Unir embeddings", "Guardar en Supabase"), ("Guardar en Supabase", "Responder a la app")]:
    link(ec, a, b)

# ── Búsqueda ───────────────────────────────────────────────────────────────
BUSCAR = """with q as (select $1::vector as v)
select * from (
  select 'task' as type, id, title, coalesce(notes, '') as detail, due_date::text as date, embedding <=> q.v as distance
  from tasks, q where user_id = $2::uuid and embedding is not null
  union all
  select 'expense', id, coalesce(merchant, category), category || ' · ' || currency || ' ' || amount::text, spent_on::text, embedding <=> q.v
  from expenses, q where user_id = $2::uuid and embedding is not null
  union all
  select 'saved', id, title, coalesce(summary, ''), created_at::date::text, embedding <=> q.v
  from saved, q where user_id = $2::uuid and embedding is not null
) r
where distance < 0.6
order by distance
limit 8;"""

buscar_nodes = [
    webhook("Entrada desde la app", "floppy-buscar", [0, 0]),
    code("Configuración", "config.js", [220, 0]),
    validar_sesion([440, 0]),
    if_node("¿Sesión válida?", "={{ $json.statusCode }}", "equals", 200, [660, 0], "number"),
    {**NO_AUTORIZADO, "position": [880, 200]},
    code("Pregunta", "buscar-pregunta.js", [880, -20]),
    gemini_http("Embedding de la pregunta", "=https://generativelanguage.googleapis.com/v1beta/models/{{ $json.embeddingModel }}:embedContent",
                "={{ JSON.stringify($json.request) }}", [1100, -20]),
    code("Vector", "buscar-vector.js", [1320, -20]),
    postgres("Buscar en Supabase", BUSCAR, "={{ $json.vector }},{{ $json.user_id }}", [1540, -20], always=True),
    code("Armar respuesta", "buscar-respuesta.js", [1760, -20], mode="runOnceForAllItems"),
    gemini_http("Gemini", "=https://generativelanguage.googleapis.com/v1beta/models/{{ $json.model }}:generateContent",
                "={{ JSON.stringify($json.request) }}", [1980, -20]),
    respond("Responder a la app",
            "={{ JSON.stringify({ ok: true, answer: ($json.candidates?.[0]?.content?.parts ?? []).map(p => p.text ?? '').join('').trim(), "
            "results: $('Armar respuesta').item.json.results.map(({ distance, ...r }) => r) }) }}",
            [2200, -20]),
]
bc = {}
for a, b in [("Entrada desde la app", "Configuración"), ("Configuración", "Validar sesión"), ("Validar sesión", "¿Sesión válida?")]:
    link(bc, a, b)
link(bc, "¿Sesión válida?", "Pregunta", 0)
link(bc, "¿Sesión válida?", "Sin sesión", 1)
for a, b in [("Pregunta", "Embedding de la pregunta"), ("Embedding de la pregunta", "Vector"), ("Vector", "Buscar en Supabase"),
             ("Buscar en Supabase", "Armar respuesta"), ("Armar respuesta", "Gemini"), ("Gemini", "Responder a la app")]:
    link(bc, a, b)

for fname, name, nodes, conn in [
    ("floppy-entrada.json", "Floppy · Entrada (voz, foto, texto o enlace)", entrada_nodes, ec),
    ("floppy-buscar.json", "Floppy · Buscar (búsqueda semántica + respuesta)", buscar_nodes, bc),
]:
    wf = {"name": name, "nodes": nodes, "connections": conn, "settings": {"executionOrder": "v1"}, "pinData": {}}
    (HERE / fname).write_text(json.dumps(wf, ensure_ascii=False, indent=2) + "\n")
    print("ok", fname, len(nodes), "nodos")
