-- ══ COMENTARIOS DE LOS REPORTES DE UTILIZACIÓN ══════════════════════════════
-- Observaciones que se escriben desde Panel de Horas Máquina y salen impresas
-- al pie del PDF, debajo de la tabla de detalle.
--
--   · ambito : 'dia' → Utilización Diaria · 'mes' → Reporte Mensual
--   · fecha  : a qué reporte pertenece. En 'dia' es el día del reporte; en
--              'mes' es el 20 de cierre del corte 21→20. Los comentarios de un
--              reporte no se arrastran a otro: cada uno lleva los suyos.
--   · eq_id  : el equipo al que se refiere. NULL = comentario general.
--              No hay llave foránea a propósito: si un equipo se elimina, el
--              comentario histórico no debe desaparecer del reporte ya emitido.
--   · texto  : lo que se imprime.
--
-- Se puede correr más de una vez: no duplica nada.

create table if not exists public.comentarios_dia (
  id          bigint primary key,
  fecha       date not null,
  eq_id       bigint,
  texto       text not null,
  creado_por  text,
  created_at  timestamptz not null default now()
);

-- Si la tabla ya se había creado sin ámbito (solo reporte diario), se agrega
-- ahora y lo ya escrito queda marcado como del día, que es lo que era.
alter table public.comentarios_dia
  add column if not exists ambito text not null default 'dia';

-- El reporte siempre pide los comentarios de UN reporte
create index if not exists ix_comentarios_dia_fecha
  on public.comentarios_dia (ambito, fecha);

-- ── Seguridad: igual que las otras tablas (sql/rls_cerrar.sql) ─────────────
alter table public.comentarios_dia enable row level security;
drop policy if exists gdar_autenticado on public.comentarios_dia;
create policy gdar_autenticado on public.comentarios_dia
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.comentarios_dia to authenticated;

-- ── Refrescar el esquema que ve la API ─────────────────────────────────────
-- Supabase guarda en caché las columnas de cada tabla. Sin esto, agregar una
-- columna da en el sistema: «Could not find the 'ambito' column of
-- 'comentarios_dia' in the schema cache», aunque en la base ya exista.
notify pgrst, 'reload schema';

-- ── Comprobación: debe devolver la tabla vacía, sin error ──────────────────
select id, ambito, fecha, eq_id, texto, creado_por from public.comentarios_dia order by fecha desc, id;
