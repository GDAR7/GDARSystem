-- ══ COMENTARIOS DEL REPORTE DIARIO DE UTILIZACIÓN ═══════════════════════════
-- Observaciones que se escriben desde Panel de Horas Máquina → Utilización
-- Diaria y salen impresas al pie del PDF, debajo de la tabla de detalle.
--
--   · fecha  : el día del reporte. Los comentarios de un día no se arrastran
--              al siguiente: cada reporte lleva los suyos.
--   · eq_id  : el equipo al que se refiere. NULL = comentario general del día.
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

-- El reporte siempre pide los comentarios de UN día
create index if not exists ix_comentarios_dia_fecha
  on public.comentarios_dia (fecha);

-- ── Seguridad: igual que las otras tablas (sql/rls_cerrar.sql) ─────────────
alter table public.comentarios_dia enable row level security;
drop policy if exists gdar_autenticado on public.comentarios_dia;
create policy gdar_autenticado on public.comentarios_dia
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.comentarios_dia to authenticated;

-- ── Comprobación: debe devolver la tabla vacía, sin error ──────────────────
select id, fecha, eq_id, texto, creado_por from public.comentarios_dia order by fecha desc, id;
