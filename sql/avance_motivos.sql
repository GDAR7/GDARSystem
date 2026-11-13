-- ══════════════════════════════════════════════════════════════════════════
--  Control de Equipos · Avance de Viajes · TIPOS DE RESTRICCIÓN
--
--  Catálogo de los motivos que frenan los viajes (pase cerrado, voladura,
--  falta de liberación…), cada uno con su N° de ítem y un código corto
--  (PC, VO, FL…) que se ve en la pantalla y en el PDF.
--  Se administra desde el botón «⛔ Tipos de restricción» del Avance de Viajes.
--
--  La leen y la escriben los usuarios con sesión, como el resto de las tablas.
--  Se puede correr más de una vez: no duplica nada.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists public.avance_motivos (
  id             bigint primary key,
  item           int not null,
  codigo         text not null,
  nombre         text not null,
  activo         boolean not null default true,
  actualizado_en timestamptz not null default now(),
  unique (codigo)
);

-- ── Los tipos de siempre, ya con código ───────────────────────────────────
insert into public.avance_motivos (id, item, codigo, nombre) values
  (1,  1,  'PC', 'Pase cerrado / tránsito restringido'),
  (2,  2,  'VO', 'Voladura'),
  (3,  3,  'LL', 'Lluvia / clima'),
  (4,  4,  'FL', 'Frente sin liberar (topografía / QA)'),
  (5,  5,  'CI', 'Equipo de carguío inoperativo'),
  (6,  6,  'VM', 'Volquete en mantenimiento'),
  (7,  7,  'EC', 'Espera de carguío / cola'),
  (8,  8,  'VE', 'Vía en mal estado'),
  (9,  9,  'FO', 'Falta de operador'),
  (10, 10, 'OT', 'Otro')
on conflict (id) do nothing;

-- ── Seguridad ──────────────────────────────────────────────────────────────
alter table public.avance_motivos enable row level security;
drop policy if exists gdar_autenticado on public.avance_motivos;
create policy gdar_autenticado on public.avance_motivos
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.avance_motivos to authenticated;

-- ── Refrescar el esquema que ve la API ─────────────────────────────────────
notify pgrst, 'reload schema';

-- ── Comprobación ───────────────────────────────────────────────────────────
-- Debe devolver los 10 tipos (o los que se hayan agregado después).
select item, codigo, nombre, activo from public.avance_motivos order by item;
