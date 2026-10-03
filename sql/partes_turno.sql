-- ══ OPERACIONES · PARTE DE TURNO ════════════════════════════════════════════
-- Registro de los trabajos ejecutados en cada turno, hecho desde el campo
-- (celular) por quien solo tiene acceso a este módulo.
--
-- No reemplaza al parte diario de equipos: aquel mide horómetros y horas para
-- valorizar; este deja constancia de QUÉ se hizo, en qué frente, con qué
-- equipos, y de las horas perdidas por clima — que es el sustento para pedir
-- ampliación de plazo.
--
--   · actividades : lista de trabajos del turno. Cada uno con frente,
--                   descripción, cantidad, unidad y los equipos empleados.
--                   Va como JSON porque un turno tiene varios y no se
--                   consultan por separado.
--   · clima_ini / clima_fin : si hubo lluvia u otro evento que paralizó el
--                   frente. De ahí salen las horas perdidas.
--   · creado_en   : desde aquí corren las 48 h para poder corregir.
--
-- Se puede correr más de una vez: no duplica nada.

create table if not exists public.partes_turno (
  id            bigint primary key,
  fecha         date not null,
  turno         text not null default 'Día',
  actividades   jsonb not null default '[]'::jsonb,
  clima         text,
  clima_obs     text,
  clima_ini     text,
  clima_fin     text,
  horas_perdidas numeric(6,2) not null default 0,
  pendiente     text,
  observaciones text,
  autor         text,
  creado_por    text,
  creado_en     timestamptz not null default now()
);

-- Se consulta siempre por fecha, del más reciente al más antiguo
create index if not exists ix_partes_turno_fecha
  on public.partes_turno (fecha desc);

-- ── Seguridad: igual que las otras tablas (sql/rls_cerrar.sql) ─────────────
alter table public.partes_turno enable row level security;
drop policy if exists gdar_autenticado on public.partes_turno;
create policy gdar_autenticado on public.partes_turno
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.partes_turno to authenticated;

-- ── Refrescar el esquema que ve la API ─────────────────────────────────────
notify pgrst, 'reload schema';

-- ── Comprobación: debe devolver la tabla vacía, sin error ──────────────────
select id, fecha, turno, horas_perdidas, autor from public.partes_turno order by fecha desc, id;
