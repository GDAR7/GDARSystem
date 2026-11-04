-- ══ REMUNERACIONES · PLANILLA · MODO DE PAGO DEL MES ═══════════════════════
-- Cómo se pagan los días de la planilla de cada mes. Se elige en Planilla de
-- sueldos, en la barra del mes: «📅 Pago por día» / «🗓️ Incidencia por mes».
--
--   · id     : año×100 + mes (noviembre 2026 = 202611): una fila por mes.
--   · modo   : 'dia' → sueldo ÷ 30 por cada día pagado (como siempre).
--              'mes' → sueldo ÷ los días que trae el mes (28, 29, 30 o 31) por
--                      cada día pagado: el mes completo paga el sueldo exacto.
--   · usuario / actualizado_en : quién lo cambió por última vez y cuándo.
--
-- Un mes SIN fila se paga por día: hasta que alguien elija otra cosa, la
-- planilla calcula exactamente igual que antes.
--
-- La leen y la cambian los usuarios con sesión, igual que el resto de las
-- tablas de la planilla. Un mes cerrado no deja cambiar el modo (la pantalla
-- pide reabrirlo primero).
--
-- Se puede correr más de una vez: no duplica nada.

create table if not exists public.planilla_modo (
  id             bigint primary key,
  mes            int  not null check (mes between 1 and 12),
  anio           int  not null,
  modo           text not null default 'dia' check (modo in ('dia','mes')),
  usuario        text,
  actualizado_en timestamptz not null default now(),
  unique (mes, anio)
);

-- ── Seguridad ──────────────────────────────────────────────────────────────
alter table public.planilla_modo enable row level security;
drop policy if exists gdar_autenticado on public.planilla_modo;
create policy gdar_autenticado on public.planilla_modo
  for all to authenticated using (true) with check (true);
grant select, insert, update, delete on public.planilla_modo to authenticated;

-- ── Refrescar el esquema que ve la API ─────────────────────────────────────
notify pgrst, 'reload schema';

-- ── Comprobación ───────────────────────────────────────────────────────────
-- Debe devolver la tabla vacía (o los meses que ya se hayan elegido).
select * from public.planilla_modo order by anio desc, mes desc;
