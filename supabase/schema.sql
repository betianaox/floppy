-- Floppy · base de datos v1 (Supabase / Postgres)
-- Se corre una vez en Supabase > SQL Editor > New query.
--
-- Quién escribe y quién lee:
--   • n8n crea las filas (lo que entiende la IA) con el usuario de la base,
--     que no pasa por RLS, y pone el user_id que validó con la sesión.
--   • La app lee, edita y borra directo con la sesión del usuario: RLS hace
--     que cada persona vea y toque solo lo suyo.

create extension if not exists vector;

-- ── Tareas (Agenda) ─────────────────────────────────────────────────────────
create table if not exists tasks (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  title       text not null,
  due_date    date,
  notes       text,
  done        boolean not null default false,
  source      text not null default 'text' check (source in ('audio', 'image', 'text', 'link')),
  embedding   vector(768),
  created_at  timestamptz not null default now()
);

-- ── Gastos ──────────────────────────────────────────────────────────────────
create table if not exists expenses (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  merchant    text,
  amount      numeric(12, 2) not null check (amount >= 0),
  currency    text not null default 'ARS',
  category    text not null,
  spent_on    date not null default current_date,
  items       jsonb,
  photo_path  text,
  source      text not null default 'text' check (source in ('audio', 'image', 'text', 'link')),
  embedding   vector(768),
  created_at  timestamptz not null default now()
);

-- ── Guardados: notas, enlaces y fotos ───────────────────────────────────────
create table if not exists saved (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  kind        text not null check (kind in ('note', 'link', 'photo')),
  title       text not null,
  summary     text,
  content     text,
  url         text,
  photo_path  text,
  tags        text[] not null default '{}',
  source      text not null default 'text' check (source in ('audio', 'image', 'text', 'link')),
  embedding   vector(768),
  created_at  timestamptz not null default now()
);

create index if not exists tasks_user_due_idx on tasks (user_id, done, due_date);
create index if not exists expenses_user_month_idx on expenses (user_id, spent_on);
create index if not exists saved_user_idx on saved (user_id, created_at desc);
create index if not exists saved_tags_idx on saved using gin (tags);

-- ── Seguridad por fila ──────────────────────────────────────────────────────
alter table tasks enable row level security;
alter table expenses enable row level security;
alter table saved enable row level security;

do $$
declare t text;
begin
  foreach t in array array['tasks', 'expenses', 'saved'] loop
    execute format('drop policy if exists "propio" on %I', t);
    execute format(
      'create policy "propio" on %I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- ── Fotos (tickets y guardados) ─────────────────────────────────────────────
-- Bucket privado; cada persona sube y lee solo dentro de su carpeta <user_id>/.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "fotos propias" on storage.objects;
create policy "fotos propias" on storage.objects for all to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ── Resumen del mes (lo usa la pantalla de Gastos) ──────────────────────────
create or replace view expenses_by_month
with (security_invoker = true) as
select user_id,
       date_trunc('month', spent_on)::date as month,
       category,
       currency,
       sum(amount) as total,
       count(*)    as count
from expenses
group by 1, 2, 3, 4;
