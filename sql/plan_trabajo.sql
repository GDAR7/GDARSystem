-- ══ OPERACIONES · PLAN DE TRABAJO (diario o semanal) ════════════════════════
-- Lo planificado para el día o la semana: actividades con su frente, meta,
-- equipos del Máster, personal y responsable, y las fotos aéreas (dron) con
-- las zonas de cada actividad marcadas encima. Se llena en
-- Operaciones → 📋 Plan de Trabajo y sale en PDF.
--
-- Una fila = un plan.
--   · id            : lo genera la pantalla (marca de tiempo).
--   · tipo          : 'Diario' o 'Semanal'.
--   · fecha         : el día del plan; en el semanal, el lunes de la semana.
--   · turno         : 'Día', 'Noche' o 'Día y Noche'.
--   · titulo, responsable.
--   · actividades   : [{uid, dia, frente, descripcion, meta, unidad, eqIds,
--                       equipos, personal, responsable}]
--                     dia: solo en el semanal ('' = toda la semana).
--   · fotos         : [{url, path, nombre, nota, asp,
--                       marcas:[{tipo:'zona'|'flecha'|'numero', act, pts:[{x,y}]}]}]
--                     x, y en % de la foto; act = uid de la actividad.
--   · observaciones, autor, creado_en, actualizado_en.
--
-- Las fotos van al mismo depósito que el Parte de Turno (AuxMec_Evidencias),
-- en la carpeta plan-trabajo/: no hace falta crear nada en Storage.
--
-- La leen y la escriben los usuarios con sesión, como el resto de las tablas.
-- Se puede correr más de una vez: no duplica nada.

create table if not exists public.plan_trabajo (
  id             bigint primary key,
  tipo           text not null default 'Diario' check (tipo in ('Diario','Semanal')),
  fecha          date not null,
  turno          text not null default 'Día',
  titulo         text,
  responsable    text,
  actividades    jsonb not null default '[]'::jsonb,
  fotos          jsonb not null default '[]'::jsonb,
  observaciones  text,
  autor          text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists plan_trabajo_fecha on public.plan_trabajo (fecha desc, tipo);

-- ── Seguridad ──────────────────────────────────────────────────────────────
alter table public.plan_trabajo enable row level security;
drop policy if exists gdar_autenticado on public.plan_trabajo;
create policy gdar_autenticado on public.plan_trabajo
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.plan_trabajo to authenticated;

-- ── Refrescar el esquema que ve la API ─────────────────────────────────────
notify pgrst, 'reload schema';

-- ── Comprobación ───────────────────────────────────────────────────────────
-- Debe devolver la tabla vacía (o los planes que ya se hayan guardado).
select id, tipo, fecha, turno, jsonb_array_length(actividades) as actividades,
       jsonb_array_length(fotos) as fotos
from public.plan_trabajo order by fecha desc;
